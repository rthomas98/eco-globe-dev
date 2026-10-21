import { randomUUID } from "node:crypto";
import type { DemoPlaylistResponse, DemoPlaylistSummary } from "../../shared/src/demo-playlists-api.js";
import type { DemoPlaylistCommitInput, DemoPlaylistCommitReceipt, DemoPlaylistPreview, DemoPlaylistSource } from "./demo-playlist-publishing.js";
import { queryRowsWithParams, queryRowsWithParamsInTransaction, runInTransaction, sql, type QueryParameter } from "./database.js";
import { canonical, digest, invalid, object, parseDemoPlaylist, parseDemoPlaylistPlan, positiveId, slug, text, uuid } from "./demo-playlist-domain.js";
import { ApiError } from "./http.js";

type Execute = (statement: string, parameters?: QueryParameter[]) => Promise<Record<string, unknown>[]>;
const param = (name: string, value: unknown): QueryParameter => ({ name, value, type: typeof value === "number" ? sql.Int : sql.NVarChar(sql.MAX) });
function conflict(): never { throw new ApiError(409, "Reviewed playlist preview is stale or conflicts with an existing commit."); }
function parseJson(value: unknown): unknown { if (typeof value !== "string") return invalid(); return JSON.parse(value); }

async function lockPlaylist(execute: Execute, playlistSlug: string) {
  // Transaction-owned lock also serializes the absent-playlist case without wide range locks.
  const result = await execute(`DECLARE @result INT; EXEC @result=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000; SELECT @result result`, [param("resource", `demo-playlist:${playlistSlug}`)]);
  if (typeof result[0]?.result !== "number" || result[0].result < 0) conflict();
}
async function targetState(execute: Execute, playlistSlug: string) {
  const parameters = [param("slug", playlistSlug)];
  const playlist = await execute(`SELECT Slug slug,CurrentRevision revision,IsEnabled enabled,IsPublic publicFlag,CONVERT(VARCHAR(16),CAST(Version AS BINARY(8)),2) version FROM dbo.DemoPlaylists WITH(UPDLOCK,HOLDLOCK) WHERE Slug=@slug`, parameters);
  const memberships = await execute(`SELECT CONVERT(VARCHAR(36),EntryId) id,CONVERT(VARCHAR(16),CAST(Version AS BINARY(8)),2) version FROM dbo.DemoPlaylistMemberships WITH(UPDLOCK,HOLDLOCK) WHERE PlaylistSlug=@slug ORDER BY EntryId`, parameters);
  const profiles = await execute(`SELECT CONVERT(VARCHAR(36),CompanyId) id,CONVERT(VARCHAR(16),CAST(Version AS BINARY(8)),2) version FROM dbo.DemoPlaylistProfiles WITH(UPDLOCK,HOLDLOCK) WHERE PlaylistSlug=@slug ORDER BY CompanyId`, parameters);
  // Source disable is an independent withdrawal, so bind it as well as membership versions.
  const sources = await execute(`SELECT CONVERT(VARCHAR(36),EntryId) id,IsEnabled enabled FROM dbo.DemoPlaylistSources WITH(UPDLOCK,HOLDLOCK) WHERE PlaylistSlug=@slug AND Revision=(SELECT CurrentRevision FROM dbo.DemoPlaylists WHERE Slug=@slug) ORDER BY EntryId`, parameters);
  return { playlist, memberships, profiles, sources };
}
async function sourceState(execute: Execute, source: Pick<DemoPlaylistSource, "kind" | "id">, lock: boolean) {
  const hint = lock ? "WITH(UPDLOCK,HOLDLOCK)" : "";
  const companyHint = lock ? "WITH(UPDLOCK,HOLDLOCK)" : "";
  let rows: Record<string, unknown>[];
  if (source.kind === "market_record") {
    rows = await execute(`SELECT m.Role role,LOWER(CONVERT(VARCHAR(16),CAST(m.Version AS BINARY(8)),2)) sourceVersion FROM dbo.MarketRecords m ${hint} WHERE m.Id=@id AND m.Status='active'`, [param("id", source.id)]);
  } else {
    const listing = source.kind === "listing";
    rows = await execute(listing
      ? `SELECT 'seller' role,(SELECT l.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) payload,c.VerificationStatusId companyStatus FROM dbo.Listings l ${hint}
         JOIN dbo.ListingStatuses st ON st.Id=l.ListingStatusId JOIN dbo.Companies c ${companyHint} ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId
         WHERE l.Id=@id AND st.Code='draft' AND cs.Code NOT IN ('inactive','suspended')`
      : `SELECT 'buyer' role,(SELECT w.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) payload,c.VerificationStatusId companyStatus FROM dbo.WantedListings w ${hint}
         JOIN dbo.Companies c ${companyHint} ON c.Id=w.BuyerCompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId
         WHERE w.Id=@id AND w.IsDraft=1 AND w.IsOpen=0 AND cs.Code NOT IN ('inactive','suspended')`, [param("id", source.id)]);
  }
  const row = rows[0]; if (!row || rows.length !== 1) conflict();
  return { version: source.kind === "market_record" ? text(row.sourceVersion, 16) : digest({ payload: parseJson(row.payload), companyStatus: row.companyStatus }), role: row.role };
}
/** Private source version reader; no public route exposes this result. */
export async function readDemoPlaylistSourceVersion(source: Pick<DemoPlaylistSource, "kind" | "id">): Promise<string> {
  positiveId(source.id); if (!["listing", "wanted", "market_record"].includes(source.kind)) invalid();
  return (await sourceState(queryRowsWithParams, source, false)).version;
}

export async function previewDemoPlaylist(input: unknown): Promise<DemoPlaylistPreview> {
  const plan = parseDemoPlaylistPlan(input);
  return runInTransaction(async tx => {
    const execute: Execute = (statement, parameters = []) => queryRowsWithParamsInTransaction(tx, statement, parameters);
    await lockPlaylist(execute, plan.detail.playlist.slug);
    if (!(await execute("SELECT Id FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id", [param("id", plan.approvedByUserId)])).length) invalid();
    const target = await targetState(execute, plan.detail.playlist.slug);
    const sources = [];
    for (const source of [...plan.sources].sort((a,b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`))) {
      const state = await sourceState(execute, source, true);
      if ((source.expectedVersion && source.expectedVersion !== state.version) || plan.detail.materials.find(m => m.id === source.entryId)?.kind !== state.role) conflict();
      sources.push({ ...source, expectedVersion: state.version });
    }
    const payload = { plan: { ...plan, sources }, target }, hash = digest(payload), id = randomUUID(), expiresAt = new Date(Date.now() + 3600000).toISOString();
    await execute(`INSERT dbo.DemoPlaylistPreviews(Id,PlaylistSlug,ApprovedByUserId,Digest,PayloadJson,ExpiresAt) VALUES(@id,@slug,@user,@digest,@payload,CONVERT(DATETIME2,@expires,127))`, [param("id", id), param("slug", plan.detail.playlist.slug), param("user", plan.approvedByUserId), param("digest", hash), param("payload", canonical(payload)), param("expires", expiresAt)]);
    return { id, digest: hash, expiresAt, totals: { companies: plan.detail.companies.length, materials: plan.detail.materials.length, relationships: plan.detail.relationships.length } };
  });
}
function receipt(value: unknown): DemoPlaylistCommitReceipt {
  const row = object(value);
  return { previewId: uuid(row.previewId), digest: text(row.digest, 64), playlistSlug: slug(row.playlistSlug), revision: positiveId(row.revision), created: Number(row.created), unchanged: Number(row.unchanged) };
}
export async function commitDemoPlaylist(input: DemoPlaylistCommitInput): Promise<DemoPlaylistCommitReceipt> {
  const previewId = uuid(input.previewId), expectedDigest = text(input.expectedDigest, 64), idempotencyKey = uuid(input.idempotencyKey), user = positiveId(input.approvedByUserId), reason = text(input.reason, 1000);
  if (!/^[a-f0-9]{64}$/u.test(expectedDigest)) invalid();
  const requestHash = digest({ previewId, expectedDigest, idempotencyKey, user, reason });
  return runInTransaction(async tx => {
    const execute: Execute = (statement, parameters = []) => queryRowsWithParamsInTransaction(tx, statement, parameters);
    // Read slug before taking any update lock, then use one deterministic per-playlist order.
    const found = await execute("SELECT PlaylistSlug slug FROM dbo.DemoPlaylistPreviews WHERE Id=@id AND ApprovedByUserId=@user", [param("id", previewId), param("user", user)]);
    if (!found.length) conflict();
    const playlistSlug = slug(found[0]!.slug);
    await lockPlaylist(execute, playlistSlug);
    const parameters = [param("id", previewId), param("user", user), param("key", idempotencyKey)];
    // Actor/key serialization also covers concurrent commits to different playlists.
    const keyLock = await execute(`DECLARE @result INT; EXEC @result=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000; SELECT @result result`, [param("resource", `demo-playlist-key:${user}:${idempotencyKey}`)]);
    if (typeof keyLock[0]?.result !== "number" || keyLock[0].result < 0) conflict();
    const previous = await execute("SELECT Id id FROM dbo.DemoPlaylistPreviews WITH(UPDLOCK,HOLDLOCK) WHERE ApprovedByUserId=@user AND CommitKey=@key", parameters);
    if (previous.length && String(previous[0]!.id).toLowerCase() !== previewId) conflict();
    const saved = (await execute("SELECT PayloadJson payload,Digest digest,ExpiresAt expires,ResultJson result,CommitHash commitHash FROM dbo.DemoPlaylistPreviews WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND ApprovedByUserId=@user", parameters))[0];
    if (!saved || saved.digest !== expectedDigest) conflict();
    if (saved.result !== null) { if (saved.commitHash !== requestHash) conflict(); return receipt(parseJson(saved.result)); }
    if (!(saved.expires instanceof Date) || saved.expires.getTime() <= Date.now()) conflict();
    const payload = object(parseJson(saved.payload)), plan = parseDemoPlaylistPlan(payload.plan);
    if (digest(payload) !== expectedDigest || plan.approvedByUserId !== user || plan.detail.playlist.slug !== playlistSlug) conflict();
    const current = await targetState(execute, playlistSlug);
    if (digest(current) !== digest(payload.target)) conflict();
    for (const source of [...plan.sources].sort((a,b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`))) {
      const state = await sourceState(execute, source, true);
      if (state.version !== source.expectedVersion || plan.detail.materials.find(m => m.id === source.entryId)?.kind !== state.role) conflict();
    }
    const old = current.playlist[0];
    // A disabled playlist needs an explicit separate administrative decision, never resurrection by import.
    if (old && (old.enabled !== true || old.publicFlag !== true)) conflict();
    const revision = Number(old?.revision ?? 0) + 1;
    const args = [param("slug", playlistSlug), param("revision", revision)];
    if (!old) await execute("INSERT dbo.DemoPlaylists(Slug,Name) VALUES(@slug,@name)", [param("slug", playlistSlug), param("name", plan.detail.playlist.name)]);
    await execute(`INSERT dbo.DemoPlaylistRevisions(PlaylistSlug,Revision,PayloadJson,ProvenanceJson,Digest,ApprovedByUserId) VALUES(@slug,@revision,@publicJson,@privateJson,@digest,@user)`, [...args, param("user", user), param("digest", expectedDigest), param("publicJson", canonical(plan.detail)), param("privateJson", canonical({ ...plan, commitReason: reason }))]);
    for (const source of plan.sources) await execute(`INSERT dbo.DemoPlaylistSources(PlaylistSlug,Revision,EntryId,Kind,SourceListingId,SourceWantedListingId,SourceMarketRecordId,SourceVersion)
      VALUES(@slug,@revision,@entry,@kind,@listing,@wanted,@market,@version)`, [...args, param("entry", source.entryId), param("kind", source.kind), param("listing", source.kind === "listing" ? source.id : null), param("wanted", source.kind === "wanted" ? source.id : null), param("market", source.kind === "market_record" ? source.id : null), param("version", source.expectedVersion)]);
    // Replacement snapshots do not turn disabled memberships/profiles back on.
    for (const material of plan.detail.materials) await execute(`IF NOT EXISTS(SELECT 1 FROM dbo.DemoPlaylistMemberships WHERE PlaylistSlug=@slug AND EntryId=@entry) INSERT dbo.DemoPlaylistMemberships(PlaylistSlug,EntryId) VALUES(@slug,@entry)`, [...args, param("entry", material.id)]);
    for (const company of plan.detail.companies) await execute(`IF NOT EXISTS(SELECT 1 FROM dbo.DemoPlaylistProfiles WHERE PlaylistSlug=@slug AND CompanyId=@company) INSERT dbo.DemoPlaylistProfiles(PlaylistSlug,CompanyId) VALUES(@slug,@company)`, [...args, param("company", company.id)]);
    await execute("UPDATE dbo.DemoPlaylists SET Name=@name,CurrentRevision=@revision WHERE Slug=@slug", [...args, param("name", plan.detail.playlist.name)]);
    const result: DemoPlaylistCommitReceipt = { previewId, digest: expectedDigest, playlistSlug, revision, created: plan.detail.materials.length, unchanged: 0 };
    await execute("UPDATE dbo.DemoPlaylistPreviews SET CommitKey=@key,CommitHash=@hash,ResultJson=@result,CommittedAt=SYSUTCDATETIME() WHERE Id=@id", [param("id", previewId), param("key", idempotencyKey), param("hash", requestHash), param("result", canonical(result))]);
    return result;
  });
}

export async function listDemoPlaylists(): Promise<DemoPlaylistSummary[]> {
  const rows = await queryRowsWithParams("SELECT Slug slug,Name name FROM dbo.DemoPlaylists WHERE IsEnabled=1 AND IsPublic=1 AND CurrentRevision>0 ORDER BY CASE Slug WHEN 'fuel-lsu' THEN 0 ELSE 1 END");
  return rows.map(row => ({ slug: slug(row.slug), name: text(row.name, 240) }));
}
const eligible = `((s.Kind='market_record' AND m.Status='active') OR
 (s.Kind='listing' AND ls.Code='draft' AND lcs.Code NOT IN ('inactive','suspended')) OR
 (s.Kind='wanted' AND w.IsDraft=1 AND w.IsOpen=0 AND wcs.Code NOT IN ('inactive','suspended')))`;
export async function readDemoPlaylist(playlist: string): Promise<DemoPlaylistResponse | null> {
  const playlistSlug = slug(playlist);
  // One SQL statement observes payload, withdrawal flags and all current source eligibility together.
  const rows = await queryRowsWithParams(`SELECT r.PayloadJson payload,
    COALESCE((SELECT CONVERT(VARCHAR(36),s.EntryId) id FROM dbo.DemoPlaylistSources s
      JOIN dbo.DemoPlaylistMemberships pm ON pm.PlaylistSlug=s.PlaylistSlug AND pm.EntryId=s.EntryId
      LEFT JOIN dbo.MarketRecords m ON m.Id=s.SourceMarketRecordId
      LEFT JOIN dbo.Listings l ON l.Id=s.SourceListingId LEFT JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId
      LEFT JOIN dbo.Companies lc ON lc.Id=l.SellerCompanyId LEFT JOIN dbo.AccountStatuses lcs ON lcs.Id=lc.VerificationStatusId
      LEFT JOIN dbo.WantedListings w ON w.Id=s.SourceWantedListingId LEFT JOIN dbo.Companies wc ON wc.Id=w.BuyerCompanyId LEFT JOIN dbo.AccountStatuses wcs ON wcs.Id=wc.VerificationStatusId
      WHERE s.PlaylistSlug=p.Slug AND s.Revision=p.CurrentRevision AND s.IsEnabled=1 AND pm.IsEnabled=1 AND pm.IsPublic=1 AND ${eligible} FOR JSON PATH),N'[]') entries,
    COALESCE((SELECT CONVERT(VARCHAR(36),CompanyId) id FROM dbo.DemoPlaylistProfiles WHERE PlaylistSlug=p.Slug AND IsEnabled=1 FOR JSON PATH),N'[]') profiles
    FROM dbo.DemoPlaylists p JOIN dbo.DemoPlaylistRevisions r ON r.PlaylistSlug=p.Slug AND r.Revision=p.CurrentRevision
    WHERE p.Slug=@slug AND p.IsEnabled=1 AND p.IsPublic=1`, [param("slug", playlistSlug)]);
  const row = rows[0]; if (!row) return null;
  const saved = parseDemoPlaylist(parseJson(row.payload));
  function ids(value: unknown) { const parsed = parseJson(value); if (!Array.isArray(parsed)) invalid(); return new Set(parsed.map(v => uuid(object(v).id))); }
  const entries = ids(row.entries), profiles = ids(row.profiles);
  const materials = saved.materials.filter(m => entries.has(m.id) && profiles.has(m.companyId));
  const companies = saved.companies.filter(c => profiles.has(c.id)).map(c => ({ ...c, materialState: materials.some(m => m.companyId === c.id) ? "available" as const : "no_material_data" as const }));
  const relationships = saved.relationships.filter(r => profiles.has(r.fromCompanyId) && (r.target.kind === "group" || profiles.has(r.target.companyId)));
  const mapped = materials.filter(m => m.geography.kind === "point").length;
  return parseDemoPlaylist({ ok: true, playlist: saved.playlist, companies, materials, relationships, counts: { companies: companies.length, materials: materials.length, mapped, pending: materials.length - mapped } });
}
