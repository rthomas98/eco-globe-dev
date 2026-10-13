import { createHash, randomUUID } from "node:crypto";
import type {
  MarketRecord,
  MarketRecordData,
  MarketRecordList,
  MarketAuditList,
  MarketPreview,
  MarketCommitRequest,
  MarketCommitResult,
  MarketPreviewRow,
} from "../../shared/src/market-records-api.js";
import {
  queryRowsWithParams,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import {
  MarketRecordError,
  fingerprint,
  recordInput,
  reviewRecord,
  choice,
  reviewStatuses,
  text,
  invalid,
  uuid,
  importDisposition,
} from "./market-record-domain.js";

type Row = Record<string, unknown>;
const str = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.NVarChar(sql.MAX),
  value: value === null || value === undefined ? null : String(value),
});
const int = (name: string, value: number): QueryParameter => ({
  name,
  type: sql.Int,
  value,
});
const binary = (name: string, value: Buffer): QueryParameter => ({
  name,
  type: sql.VarBinary(value.length),
  value,
});
const query = (
  tx: sql.Transaction,
  statement: string,
  params: QueryParameter[] = [],
) => queryRowsWithParamsInTransaction<Row>(tx, statement, params);
const nullable = (value: unknown): string | null =>
  value === null || value === undefined
    ? null
    : value instanceof Date
      ? value.toISOString()
      : String(value);
const date = (value: unknown) =>
  value instanceof Date ? value.toISOString() : String(value);
const number = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);
const canonical = (value: unknown): string | null =>
  nullable(value)
    ?.replace(/(\.\d*?)0+$/u, "$1")
    .replace(/\.$/u, "") ?? null;

const select = `SELECT r.*,CONVERT(VARCHAR(16),r.Version,2) VersionHex,
 CONVERT(VARCHAR(40),r.PriceValue) PriceString,CONVERT(VARCHAR(40),r.VolumeValue) VolumeString,
 creator.Name CreatedByUserName,updater.Name UpdatedByUserName,archiver.Name ArchivedByUserName,
 pr.Name PriceReviewerName,vr.Name VolumeReviewerName,ar.Name AddressReviewerName
 FROM dbo.MarketRecords r
 JOIN dbo.Users creator ON creator.Id=r.CreatedByUserId JOIN dbo.Users updater ON updater.Id=r.UpdatedByUserId
 LEFT JOIN dbo.Users archiver ON archiver.Id=r.ArchivedByUserId
 LEFT JOIN dbo.Users pr ON pr.Id=r.PriceReviewedBy LEFT JOIN dbo.Users vr ON vr.Id=r.VolumeReviewedBy LEFT JOIN dbo.Users ar ON ar.Id=r.AddressReviewedBy`;
function hydrate(row: Row): MarketRecord {
  const review = (prefix: string) => ({
    status: choice(row[prefix + "Status"], reviewStatuses, "stored review"),
    citation: nullable(row[prefix + "Citation"]),
    reviewedByUserId: number(row[prefix + "ReviewedBy"]),
    reviewedByUserName: nullable(row[prefix + "ReviewerName"]),
    reviewedAt: nullable(row[prefix + "ReviewedAt"]),
  });
  const input = recordInput({
    role: row.Role,
    companyName: row.CompanyName,
    facilityName: row.FacilityName,
    feedstock: row.Feedstock,
    feedstockGroup: row.FeedstockGroup,
    buyerNeed: row.BuyerNeed,
    sourceRecordType: row.SourceRecordType,
    sourceChecked: row.SourceChecked,
    sourceCitation: row.SourceCitation,
    addressSource: row.AddressSource,
    sourceCheckedBy: row.SourceCheckedBy,
    sourceCheckedAt: nullable(row.SourceCheckedAt),
    address: {
      street: row.Street,
      city: row.City,
      stateProvince: row.StateProvince,
      postalCode: row.PostalCode,
      countryCode: row.CountryCode,
      purpose: row.AddressPurpose,
    },
    price: {
      value: canonical(row.PriceString),
      currencyCode: row.PriceCurrency,
      perUnit: row.PricePerUnit,
      citation: row.PriceCitation,
    },
    volume: {
      value: canonical(row.VolumeString),
      unit: row.VolumeUnit,
      period: row.VolumePeriod,
      citation: row.VolumeCitation,
    },
  });
  return {
    ...input,
    price: { ...input.price, ...review("Price") },
    volume: { ...input.volume, ...review("Volume") },
    addressReview: review("Address"),
    id: Number(row.Id),
    version: String(row.VersionHex).toLowerCase(),
    status: choice(row.Status, ["active", "archived"], "stored status"),
    archivedAt: nullable(row.ArchivedAt),
    archivedByUserId: number(row.ArchivedByUserId),
    archivedByUserName: nullable(row.ArchivedByUserName),
    archiveReason: nullable(row.ArchiveReason),
    importBatchId: nullable(row.ImportBatchId)?.toLowerCase() ?? null,
    sourceRowRef: nullable(row.SourceRowRef),
    createdAt: date(row.CreatedAt),
    updatedAt: date(row.UpdatedAt),
    createdByUserId: Number(row.CreatedByUserId),
    updatedByUserId: Number(row.UpdatedByUserId),
    createdByUserName: nullable(row.CreatedByUserName),
    updatedByUserName: nullable(row.UpdatedByUserName),
  };
}
export async function marketWrite<T>(
  work: (tx: sql.Transaction) => Promise<T>,
): Promise<T> {
  return runInTransaction(async (tx) => {
    const rows = await query(
      tx,
      `DECLARE @result INT; EXEC @result=sys.sp_getapplock @Resource='market-records-write',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`,
    );
    if (typeof rows[0]?.result !== "number" || rows[0].result < 0)
      throw new MarketRecordError(
        409,
        "write_busy",
        "Another record change is in progress. Retry shortly.",
      );
    return work(tx);
  });
}
export async function getRecord(
  id: number,
  tx?: sql.Transaction,
): Promise<MarketRecord> {
  const rows = tx
    ? await query(tx, select + " WHERE r.Id=@id", [int("id", id)])
    : await queryRowsWithParams<Row>(select + " WHERE r.Id=@id", [
        int("id", id),
      ]);
  if (!rows[0])
    throw new MarketRecordError(
      404,
      "record_not_found",
      "Market record not found.",
    );
  return hydrate(rows[0]);
}
function fields(data: MarketRecordData): Record<string, unknown> {
  const a = data.address;
  const result: Record<string, unknown> = {
    Role: data.role,
    CompanyName: data.companyName,
    FacilityName: data.facilityName,
    Feedstock: data.feedstock,
    FeedstockGroup: data.feedstockGroup,
    BuyerNeed: data.buyerNeed,
    SourceRecordType: data.sourceRecordType,
    SourceChecked:
      data.sourceChecked === null ? null : data.sourceChecked ? 1 : 0,
    SourceCitation: data.sourceCitation,
    AddressSource: data.addressSource,
    SourceCheckedBy: data.sourceCheckedBy,
    SourceCheckedAt: data.sourceCheckedAt,
    Street: a.street,
    City: a.city,
    StateProvince: a.stateProvince,
    PostalCode: a.postalCode,
    CountryCode: a.countryCode,
    AddressPurpose: a.purpose,
    PriceValue: data.price.value,
    PriceCurrency: data.price.currencyCode,
    PricePerUnit: data.price.perUnit,
    VolumeValue: data.volume.value,
    VolumeUnit: data.volume.unit,
    VolumePeriod: data.volume.period,
  };
  for (const [prefix, review] of [
    ["Price", data.price],
    ["Volume", data.volume],
    ["Address", data.addressReview],
  ] as const) {
    result[prefix + "Status"] = review.status;
    result[prefix + "Citation"] = review.citation;
    result[prefix + "ReviewedBy"] = review.reviewedByUserId;
    result[prefix + "ReviewedAt"] = review.reviewedAt;
  }
  return result;
}
async function identity(
  tx: sql.Transaction,
  data: MarketRecordData,
): Promise<number | null> {
  const rows = await query(
    tx,
    "SELECT MarketRecordId id FROM dbo.MarketRecordIdentities WHERE Fingerprint=@fingerprint",
    [binary("fingerprint", fingerprint(data))],
  );
  return rows[0] ? Number(rows[0].id) : null;
}
async function alias(tx: sql.Transaction, data: MarketRecordData, id: number) {
  await query(
    tx,
    "IF NOT EXISTS(SELECT 1 FROM dbo.MarketRecordIdentities WHERE Fingerprint=@fingerprint) INSERT dbo.MarketRecordIdentities(Fingerprint,MarketRecordId) VALUES(@fingerprint,@id)",
    [binary("fingerprint", fingerprint(data)), int("id", id)],
  );
}
async function audit(
  tx: sql.Transaction,
  actor: number,
  action: string,
  previous: MarketRecord | null,
  next: MarketRecord | null,
  reason: string,
  importSummary?: MarketCommitResult,
) {
  const actionCode =
    action === "create" ? "created" : action === "update" ? "updated" : action;
  await query(
    tx,
    `INSERT dbo.AuditLogs(ActorUserId,ActorTypeId,ActionTypeId,RecordTypeId,RecordId,PreviousValue,NewValue,Reason,CreatedByUserId,UpdatedByUserId)
 VALUES(@actor,(SELECT Id FROM dbo.ActorTypes WHERE Code='admin'),(SELECT Id FROM dbo.AuditActionTypes WHERE Code=@action),(SELECT Id FROM dbo.RecordTypes WHERE Code=@type),@id,@previous,@next,@reason,@actor,@actor)`,
    [
      int("actor", actor),
      str("action", actionCode),
      str("type", importSummary ? "market_record_import" : "market_record"),
      { name: "id", type: sql.Int, value: next?.id ?? previous?.id ?? null },
      str("previous", previous ? JSON.stringify(previous) : null),
      str("next", JSON.stringify(importSummary ?? next)),
      str("reason", reason),
    ],
  );
}
async function insert(
  tx: sql.Transaction,
  data: MarketRecordData,
  actor: number,
  reason: string,
  provenance?: { batch: string; row: string },
): Promise<MarketRecord> {
  const existing = await identity(tx, data);
  if (existing !== null)
    throw new MarketRecordError(
      409,
      "duplicate_identity",
      `An existing record (${existing}) has this identity.`,
      { existingId: String(existing) },
    );
  const values = {
    ...fields(data),
    CreatedByUserId: actor,
    UpdatedByUserId: actor,
    ImportBatchId: provenance?.batch ?? null,
    SourceRowRef: provenance?.row ?? null,
  };
  const columns = Object.keys(values);
  const rows = await query(
    tx,
    `INSERT dbo.MarketRecords(${columns.join(",")}) OUTPUT INSERTED.Id id VALUES(${columns.map((_, i) => "@p" + i).join(",")})`,
    Object.values(values).map((value, i) => str("p" + i, value)),
  );
  const id = Number(rows[0]?.id);
  await alias(tx, data, id);
  const record = await getRecord(id, tx);
  await audit(tx, actor, "create", null, record, reason);
  return record;
}
export const createRecord = (
  data: MarketRecordData,
  actor: number,
  reason = "Created internal research record.",
) => marketWrite((tx) => insert(tx, data, actor, reason));
function checkVersion(record: MarketRecord, expected: string) {
  if (record.version !== expected)
    throw new MarketRecordError(
      409,
      "stale_version",
      "This record changed. Reload before saving.",
      { currentVersion: record.version },
    );
}
export async function changeRecord(
  id: number,
  expected: string,
  actor: number,
  reason: string,
  operation:
    | { kind: "edit"; changes: unknown }
    | { kind: "archive" | "restore" }
    | {
        kind: "review";
        field: "price" | "volume" | "address";
        status: unknown;
        citation: unknown;
      },
) {
  return marketWrite(async (tx) => {
    const previous = await getRecord(id, tx);
    checkVersion(previous, expected);
    if (operation.kind === "edit" && previous.status === "archived")
      throw new MarketRecordError(
        409,
        "record_archived",
        "Restore this record before editing.",
      );
    if (
      (operation.kind === "archive" && previous.status === "archived") ||
      (operation.kind === "restore" && previous.status === "active")
    )
      return previous;
    let data: MarketRecordData = previous;
    if (operation.kind === "edit")
      data = recordInput(operation.changes, previous);
    if (operation.kind === "review") {
      if (previous.status === "archived")
        throw new MarketRecordError(
          409,
          "record_archived",
          "Restore this record before reviewing.",
        );
      data = reviewRecord(
        previous,
        operation.field,
        choice(operation.status, reviewStatuses, "status"),
        text(operation.citation, "citation", 2000),
        actor,
        new Date().toISOString(),
      );
    }
    const existing = await identity(tx, data);
    if (existing !== null && existing !== id)
      throw new MarketRecordError(
        409,
        "duplicate_identity",
        `An existing record (${existing}) has this identity.`,
        { existingId: String(existing) },
      );
    const values: Record<string, unknown> = {
      ...fields(data),
      UpdatedByUserId: actor,
    };
    if (operation.kind === "archive")
      Object.assign(values, {
        Status: "archived",
        ArchivedAt: new Date().toISOString(),
        ArchivedByUserId: actor,
        ArchiveReason: reason,
      });
    if (operation.kind === "restore")
      Object.assign(values, {
        Status: "active",
        ArchivedAt: null,
        ArchivedByUserId: null,
        ArchiveReason: null,
      });
    await query(
      tx,
      `UPDATE dbo.MarketRecords SET ${Object.keys(values)
        .map((key, i) => key + "=@p" + i)
        .join(",")},UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,
      [...Object.values(values).map((v, i) => str("p" + i, v)), int("id", id)],
    );
    await alias(tx, data, id);
    const next = await getRecord(id, tx);
    await audit(
      tx,
      actor,
      operation.kind === "edit" ? "update" : operation.kind,
      previous,
      next,
      reason,
    );
    return next;
  });
}
export function pagination(params: URLSearchParams) {
  const limit = params.get("limit") ?? "50",
    cursor = params.get("cursor") ?? "0";
  if (!/^\d+$/u.test(limit) || Number(limit) < 1 || Number(limit) > 200)
    invalid("limit", "limit must be between 1 and 200.");
  if (
    !/^\d+$/u.test(cursor) ||
    !Number.isSafeInteger(Number(cursor)) ||
    Number(cursor) > 2147483647
  )
    invalid("cursor", "Invalid cursor.");
  return { limit: Number(limit), cursor: Number(cursor) };
}
/** Leave response-envelope headroom below the hosted proxy payload limit. */
export function boundedPage<T>(items: T[]): T[] {
  const result: T[] = [];
  let bytes = 1024;
  for (const item of items) {
    const size = Buffer.byteLength(JSON.stringify(item), "utf8") + 1;
    if (bytes + size > 3 * 1024 * 1024) break;
    bytes += size;
    result.push(item);
  }
  if (items.length && !result.length)
    throw new MarketRecordError(
      413,
      "file_too_large",
      "A record exceeds the response limit.",
    );
  return result;
}
export async function listRecords(
  params: URLSearchParams,
): Promise<MarketRecordList> {
  const { limit, cursor } = pagination(params);
  const where: string[] = [];
  const parameters: QueryParameter[] = [];
  const filter = (column: string, value: unknown) => {
    const name = "f" + parameters.length;
    parameters.push(str(name, value));
    where.push(column + "=@" + name);
  };
  const status = choice(
    params.get("status") ?? "active",
    ["active", "archived", "all"],
    "status",
  );
  if (status !== "all") filter("r.Status", status);
  const role = params.get("role");
  if (role) filter("r.Role", choice(role, ["buyer", "seller"], "role"));
  for (const [key, column] of [
    ["sourceRecordType", "SourceRecordType"],
    ["feedstockGroup", "FeedstockGroup"],
    ["countryCode", "CountryCode"],
  ]) {
    const value = params.get(key!);
    if (value) filter("r." + column, text(value, key!, 160, true));
  }
  const batch = params.get("importBatchId");
  if (batch) filter("r.ImportBatchId", uuid(batch, "importBatchId"));
  for (const [key, column] of [
    ["sourceChecked", "SourceChecked"],
    ["hasPrice", "PriceValue"],
    ["hasVolume", "VolumeValue"],
  ]) {
    const value = params.get(key!);
    if (value !== null) {
      choice(value, ["true", "false"], key!);
      if (key === "sourceChecked")
        filter("r." + column, value === "true" ? "1" : "0");
      else
        where.push(
          "r." + column + (value === "true" ? " IS NOT NULL" : " IS NULL"),
        );
    }
  }
  const fieldStatus = params.get("fieldStatus");
  if (fieldStatus) {
    const [field, state, ...extra] = fieldStatus.split(":");
    if (extra.length) invalid("fieldStatus", "Invalid field status.");
    const prefix = choice(field, ["price", "volume", "address"], "fieldStatus");
    filter(
      "r." + prefix[0]!.toUpperCase() + prefix.slice(1) + "Status",
      choice(state, reviewStatuses, "fieldStatus"),
    );
  }
  const search = text(params.get("search"), "search", 240);
  if (search) {
    parameters.push(
      str(
        "search",
        "%" +
          search
            .replaceAll("\\", "\\\\")
            .replaceAll("%", "\\%")
            .replaceAll("_", "\\_")
            .replaceAll("[", "\\[") +
          "%",
      ),
    );
    where.push(
      "(r.CompanyName LIKE @search ESCAPE '\\' OR r.FacilityName LIKE @search ESCAPE '\\' OR r.Feedstock LIKE @search ESCAPE '\\' OR r.BuyerNeed LIKE @search ESCAPE '\\')",
    );
  }
  const clause = where.length ? " WHERE " + where.join(" AND ") : "";
  const counts = await queryRowsWithParams<Row>(
    "SELECT COUNT(*) total FROM dbo.MarketRecords r" + clause,
    parameters,
  );
  const rows = await queryRowsWithParams<Row>(
    select +
      clause +
      (clause ? " AND " : " WHERE ") +
      "r.Id>@cursor ORDER BY r.Id OFFSET 0 ROWS FETCH NEXT @take ROWS ONLY",
    [...parameters, int("cursor", cursor), int("take", limit + 1)],
  );
  const records = boundedPage(rows.slice(0, limit).map(hydrate));
  return {
    ok: true,
    records,
    total: Number(counts[0]?.total ?? 0),
    nextCursor:
      rows.length > records.length ? String(records.at(-1)?.id) : null,
  };
}
export async function recordAudit(
  id: number,
  params: URLSearchParams,
): Promise<MarketAuditList> {
  await getRecord(id);
  const { limit, cursor } = pagination(params);
  const rows = await queryRowsWithParams<Row>(
    `SELECT TOP (@take) a.Id,a.ActorUserId,u.Name ActorName,a.CreatedAt,a.Reason,a.PreviousValue,a.NewValue,t.Code Action FROM dbo.AuditLogs a JOIN dbo.RecordTypes r ON r.Id=a.RecordTypeId JOIN dbo.AuditActionTypes t ON t.Id=a.ActionTypeId LEFT JOIN dbo.Users u ON u.Id=a.ActorUserId WHERE r.Code='market_record' AND a.RecordId=@id AND a.Id>@cursor ORDER BY a.Id`,
    [int("take", limit + 1), int("id", id), int("cursor", cursor)],
  );
  const events = boundedPage(
    rows.slice(0, limit).map((r) => ({
      id: Number(r.Id),
      action: String(r.Action),
      actorUserId: Number(r.ActorUserId),
      actorUserName: nullable(r.ActorName),
      createdAt: date(r.CreatedAt),
      reason: nullable(r.Reason),
      previous: r.PreviousValue
        ? (JSON.parse(String(r.PreviousValue)) as MarketRecord)
        : null,
      next: r.NewValue
        ? (JSON.parse(String(r.NewValue)) as MarketRecord)
        : null,
    })),
  );
  return {
    ok: true,
    events,
    nextCursor: rows.length > events.length ? String(events.at(-1)?.id) : null,
  };
}
export function previewTotals(
  rows: MarketPreviewRow[],
): MarketPreview["totals"] {
  return {
    sourceRows: rows.filter(
      (r) => r.proposedRecord !== null || r.decision === "error",
    ).length,
    createRows: rows.filter((r) => r.decision === "create").length,
    duplicateRows: rows.filter(
      (r) => r.decision === "skip" && r.proposedRecord !== null,
    ).length,
    errorRows: rows.filter((r) => r.decision === "error").length,
    ignoredRows: rows.filter(
      (r) => r.proposedRecord === null && r.decision === "skip",
    ).length,
  };
}
export function nearDuplicateRows(
  rows: MarketPreviewRow[],
): Map<string, string> {
  const groups = new Map<string, Map<string, string>>(),
    identities = new Map<string, { hash: string; keys: string[] }>();
  const normalize = (value: string | null) =>
    (value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
  for (const row of rows)
    if (row.proposedRecord) {
      const data = row.proposedRecord,
        hash = fingerprint(data).toString("hex");
      const keys = [
        JSON.stringify([
          data.role,
          normalize(data.companyName),
          "facility",
          normalize(data.facilityName),
        ]),
        JSON.stringify([
          data.role,
          normalize(data.companyName),
          "feedstock",
          normalize(data.feedstock),
        ]),
      ];
      identities.set(row.rowKey, { hash, keys });
      for (const key of keys) {
        const group = groups.get(key) ?? new Map<string, string>();
        group.set(hash, row.rowKey);
        groups.set(key, group);
      }
    }
  const result = new Map<string, string>();
  for (const [rowKey, identity] of identities)
    for (const key of identity.keys) {
      const group = groups.get(key)!;
      // A different identity, not a duplicate alias; at most two entries need inspection.
      for (const [hash, other] of group)
        if (hash !== identity.hash) {
          result.set(rowKey, other);
          break;
        }
      if (result.has(rowKey)) break;
    }
  return result;
}
export async function savePreview(
  rows: MarketPreviewRow[],
  fileSha256: string,
  actor: number,
): Promise<MarketPreview> {
  return marketWrite(async (tx) => {
    const seen = new Map<string, string>(),
      nearRows = nearDuplicateRows(rows);
    for (const row of rows)
      if (row.proposedRecord && row.decision === "create") {
        const existing = await identity(tx, row.proposedRecord),
          key = fingerprint(row.proposedRecord).toString("hex");
        if (existing !== null || seen.has(key)) {
          row.decision = "skip";
          row.duplicateOfId = existing;
          row.diagnostics.push({
            severity: "warning",
            code: "duplicate_identity",
            field: null,
            message:
              existing !== null
                ? `Duplicate of internal record ${existing}; skipped.`
                : `Duplicate of ${seen.get(key)}; skipped.`,
          });
        } else {
          seen.set(key, row.rowKey);
          const data = row.proposedRecord;
          const possible = await query(
            tx,
            "SELECT TOP(3) Id FROM dbo.MarketRecords WHERE Role=@role AND CompanyName=@company AND (FacilityName=@facility OR Feedstock=@feedstock) ORDER BY Id",
            [
              str("role", data.role),
              str("company", data.companyName),
              str("facility", data.facilityName),
              str("feedstock", data.feedstock),
            ],
          );
          const local = nearRows.get(row.rowKey);
          if (possible.length || local)
            row.diagnostics.push({
              severity: "warning",
              code: "possible_duplicate",
              field: null,
              message: possible.length
                ? `Possible related internal records ${possible.map((r) => Number(r.Id)).join(", ")}; review before creating.`
                : `Possible related source row ${local}; review before creating.`,
            });
        }
      }
    const preview: MarketPreview = {
      ok: true,
      previewId: randomUUID(),
      fileSha256,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      state: "preview",
      result: null,
      rows,
      totals: previewTotals(rows),
    };
    if (Buffer.byteLength(JSON.stringify(preview), "utf8") > 3 * 1024 * 1024)
      throw new MarketRecordError(
        413,
        "file_too_large",
        "Preview exceeds 3 MiB. Split the workbook and retry.",
      );
    await query(
      tx,
      "INSERT dbo.MarketRecordImports(PreviewId,ActorUserId,FileSha256,ParserVersion,PayloadJson,ExpiresAt) VALUES(@id,@actor,@hash,'1',@payload,@expires)",
      [
        str("id", preview.previewId),
        int("actor", actor),
        binary("hash", Buffer.from(fileSha256, "hex")),
        str("payload", JSON.stringify(preview)),
        str("expires", preview.expiresAt),
      ],
    );
    return preview;
  });
}
async function previewRow(
  id: string,
  actor: number,
  tx?: sql.Transaction,
): Promise<Row> {
  const statement =
    "SELECT * FROM dbo.MarketRecordImports" +
    (tx ? " WITH(UPDLOCK,HOLDLOCK)" : "") +
    " WHERE PreviewId=@id AND ActorUserId=@actor";
  const params = [str("id", id), int("actor", actor)];
  const rows = tx
    ? await query(tx, statement, params)
    : await queryRowsWithParams<Row>(statement, params);
  if (!rows[0])
    throw new MarketRecordError(
      404,
      "preview_not_found",
      "Preview not found for this administrator.",
    );
  return rows[0];
}
function ensureLive(row: Row) {
  if (Date.parse(date(row.ExpiresAt)) <= Date.now())
    throw new MarketRecordError(
      410,
      "preview_expired",
      "Preview expired. Upload the workbook again.",
    );
}
export async function getPreview(
  id: string,
  actor: number,
): Promise<MarketPreview> {
  const row = await previewRow(id, actor);
  if (row.State !== "committed") ensureLive(row);
  const preview = JSON.parse(String(row.PayloadJson)) as MarketPreview;
  return {
    ...preview,
    state: row.State === "committed" ? "committed" : "preview",
    result: row.ResultJson
      ? (JSON.parse(String(row.ResultJson)) as MarketCommitResult)
      : null,
  };
}
export async function commitPreview(
  id: string,
  actor: number,
  request: MarketCommitRequest,
): Promise<MarketCommitResult> {
  return marketWrite(async (tx) => {
    const row = await previewRow(id, actor, tx),
      preview = JSON.parse(String(row.PayloadJson)) as MarketPreview;
    const excluded = [...new Set(request.excludedRowKeys)].sort();
    for (const key of excluded)
      if (!preview.rows.some((r) => r.rowKey === key && r.decision !== "skip"))
        invalid(
          "excludedRowKeys",
          "Only create or error rows from this preview may be excluded.",
        );
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          previewId: id,
          excludedRowKeys: excluded,
          reason: request.reason,
        }),
      )
      .digest();
    if (row.State === "committed") {
      if (
        String(row.CommitKey).toLowerCase() !== request.idempotencyKey ||
        !Buffer.isBuffer(row.CommitRequestHash) ||
        !hash.equals(row.CommitRequestHash)
      )
        throw new MarketRecordError(
          409,
          "idempotency_conflict",
          "This preview was committed with a different request.",
        );
      return JSON.parse(String(row.ResultJson)) as MarketCommitResult;
    }
    ensureLive(row);
    if (
      (
        await query(
          tx,
          "SELECT PreviewId FROM dbo.MarketRecordImports WHERE ActorUserId=@actor AND CommitKey=@key",
          [int("actor", actor), str("key", request.idempotencyKey)],
        )
      ).length
    )
      throw new MarketRecordError(
        409,
        "idempotency_conflict",
        "This idempotency key was used for another preview.",
      );
    if (
      preview.rows.some(
        (r) => r.decision === "error" && !excluded.includes(r.rowKey),
      )
    )
      throw new MarketRecordError(
        400,
        "invalid_rows_not_excluded",
        "Explicitly exclude all invalid rows before committing.",
      );
    const result: MarketCommitResult = {
      ok: true,
      importId: id,
      createdIds: [],
      skippedRows: [],
      totals: { created: 0, duplicates: 0, excluded: 0, ignored: 0 },
    };
    for (const item of preview.rows) {
      let recordId = item.proposedRecord
        ? await identity(tx, item.proposedRecord)
        : null;
      const decision = importDisposition(
        item,
        excluded.includes(item.rowKey),
        recordId,
      );
      const code =
        decision === "duplicate"
          ? "duplicate_identity"
          : decision === "ignored"
            ? "ignored_footer"
            : decision;
      if (decision === "created" && item.proposedRecord) {
        const record = await insert(
          tx,
          item.proposedRecord,
          actor,
          request.reason,
          { batch: id, row: item.rowKey },
        );
        recordId = record.id;
        result.createdIds.push(recordId);
        result.totals.created++;
      } else if (decision === "duplicate") result.totals.duplicates++;
      else if (decision === "excluded") result.totals.excluded++;
      else result.totals.ignored++;
      if (decision !== "created")
        result.skippedRows.push({
          rowKey: item.rowKey,
          code,
          duplicateOfId: decision === "duplicate" ? recordId : null,
        });
      await query(
        tx,
        "INSERT dbo.MarketRecordImportRows(ImportId,SheetName,RowNumber,RowHash,MarketRecordId,Decision,DiagnosticsJson) VALUES(@import,@sheet,@row,@hash,@record,@decision,@diagnostics)",
        [
          str("import", id),
          str("sheet", item.sheet),
          int("row", item.rowNumber),
          binary(
            "hash",
            createHash("sha256")
              .update(JSON.stringify(item.proposedRecord))
              .digest(),
          ),
          { name: "record", type: sql.Int, value: recordId },
          str("decision", decision),
          str("diagnostics", JSON.stringify(item.diagnostics)),
        ],
      );
    }
    await query(
      tx,
      "UPDATE dbo.MarketRecordImports SET State='committed',CommitKey=@key,CommitRequestHash=@hash,ResultJson=@result,CommittedAt=SYSUTCDATETIME() WHERE PreviewId=@id",
      [
        str("key", request.idempotencyKey),
        binary("hash", hash),
        str("result", JSON.stringify(result)),
        str("id", id),
      ],
    );
    await audit(tx, actor, "import", null, null, request.reason, result);
    return result;
  });
}
