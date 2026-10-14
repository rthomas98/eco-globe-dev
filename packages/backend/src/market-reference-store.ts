import type { MarketReference } from "../../shared/src/market-references-api.js";
import {
  queryRowsWithParams,
  queryRowsWithParamsInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { marketWrite } from "./market-record-store.js";
import { MarketRecordError, invalid } from "./market-record-domain.js";
import type { ValidatedReference } from "./market-reference-domain.js";

type Row = Record<string, unknown>;
const int = (name: string, value: number): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
const str = (name: string, value: string | null): QueryParameter => ({
  name,
  value,
  type: sql.NVarChar(sql.MAX),
});
const hash = (value: string): QueryParameter => ({
  name: "hash",
  value: Buffer.from(value, "hex"),
  type: sql.VarBinary(32),
});
const select = `SELECT r.Id,r.Title,r.Material,r.Notes,r.FileName,LOWER(CONVERT(VARCHAR(64),r.Sha256,2)) Sha256,r.SizeBytes,r.UploadedByUserId,u.Name UploadedByUserName,r.CreatedAt,
 (SELECT l.MarketRecordId id FROM dbo.MarketReferenceRecords l WHERE l.ReferenceId=r.Id ORDER BY l.MarketRecordId FOR JSON PATH) RecordIds
 FROM dbo.MarketReferences r LEFT JOIN dbo.Users u ON u.Id=r.UploadedByUserId`;
function hydrate(row: Row): MarketReference {
  const links: unknown =
    row.RecordIds == null ? [] : JSON.parse(String(row.RecordIds));
  if (!Array.isArray(links)) throw new Error("Invalid stored reference links");
  const recordIds = links.map((link: unknown) => {
    if (
      !link ||
      typeof link !== "object" ||
      !("id" in link) ||
      typeof link.id !== "number" ||
      !Number.isInteger(link.id)
    )
      throw new Error("Invalid stored record ID");
    return link.id;
  });
  return {
    id: Number(row.Id),
    title: String(row.Title),
    material: String(row.Material),
    notes: row.Notes == null ? null : String(row.Notes),
    fileName: String(row.FileName),
    sha256: String(row.Sha256),
    sizeBytes: Number(row.SizeBytes),
    uploadedByUserId: Number(row.UploadedByUserId),
    uploadedByUserName:
      row.UploadedByUserName == null ? null : String(row.UploadedByUserName),
    createdAt:
      row.CreatedAt instanceof Date
        ? row.CreatedAt.toISOString()
        : String(row.CreatedAt),
    recordIds,
  };
}
export async function listReferences(
  recordId?: number,
): Promise<MarketReference[]> {
  const rows = await queryRowsWithParams<Row>(
    select +
      (recordId === undefined
        ? ""
        : " WHERE EXISTS(SELECT 1 FROM dbo.MarketReferenceRecords f WHERE f.ReferenceId=r.Id AND f.MarketRecordId=@recordId)") +
      " ORDER BY r.Id DESC",
    recordId === undefined ? [] : [int("recordId", recordId)],
  );
  return rows.map(hydrate);
}
function duplicate(id: number): never {
  throw new MarketRecordError(
    409,
    "duplicate_reference",
    "This original PDF is already in the internal library.",
    { existingId: String(id) },
  );
}
export async function createReference(
  input: ValidatedReference,
  actor: number,
): Promise<MarketReference> {
  // Same transaction-owned lock as registry writes keeps record validation and associations atomic.
  try {
    return await marketWrite(async (tx) => {
      const query = (statement: string, parameters: QueryParameter[] = []) =>
        queryRowsWithParamsInTransaction<Row>(tx, statement, parameters);
      const existing = await query(
        "SELECT Id FROM dbo.MarketReferences WITH(UPDLOCK,HOLDLOCK) WHERE Sha256=@hash",
        [hash(input.sha256)],
      );
      if (existing[0]) duplicate(Number(existing[0].Id));
      for (const id of input.recordIds) {
        const records = await query(
          "SELECT Id FROM dbo.MarketRecords WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",
          [int("id", id)],
        );
        if (!records[0])
          invalid("recordIds", `Market record ${id} does not exist.`);
      }
      const rows = await query(
        `INSERT dbo.MarketReferences(Title,Material,Notes,FileName,Sha256,Content,SizeBytes,UploadedByUserId)
 OUTPUT INSERTED.Id VALUES(@title,@material,@notes,@fileName,@hash,@content,@size,@actor)`,
        [
          str("title", input.title),
          str("material", input.material),
          str("notes", input.notes),
          str("fileName", input.fileName),
          hash(input.sha256),
          { name: "content", value: input.bytes, type: sql.VarBinary(sql.MAX) },
          int("size", input.bytes.length),
          int("actor", actor),
        ],
      );
      const id = Number(rows[0]?.Id);
      if (!Number.isInteger(id) || id <= 0)
        throw new Error("Reference insert returned no ID");
      for (const recordId of input.recordIds)
        await query(
          "INSERT dbo.MarketReferenceRecords(ReferenceId,MarketRecordId) VALUES(@id,@recordId)",
          [int("id", id), int("recordId", recordId)],
        );
      const saved = await query(select + " WHERE r.Id=@id", [int("id", id)]);
      if (!saved[0]) throw new Error("Reference not found after insertion");
      const reference = hydrate(saved[0]);
      await query(
        `INSERT dbo.AuditLogs(ActorUserId,ActorTypeId,ActionTypeId,RecordTypeId,RecordId,PreviousValue,NewValue,Reason,CreatedByUserId,UpdatedByUserId)
 VALUES(@actor,(SELECT Id FROM dbo.ActorTypes WHERE Code='admin'),(SELECT Id FROM dbo.AuditActionTypes WHERE Code='created'),(SELECT Id FROM dbo.RecordTypes WHERE Code='market_reference'),@id,NULL,@next,@reason,@actor,@actor)`,
        [
          int("actor", actor),
          int("id", id),
          str("next", JSON.stringify(reference)),
          str("reason", input.reason),
        ],
      );
      return reference;
    });
  } catch (error) {
    // Constraint remains authoritative even if another writer does not take our application lock.
    if (
      error &&
      typeof error === "object" &&
      "number" in error &&
      (error.number === 2601 || error.number === 2627)
    ) {
      const existing = await queryRowsWithParams<Row>(
        "SELECT Id FROM dbo.MarketReferences WHERE Sha256=@hash",
        [hash(input.sha256)],
      );
      if (existing[0]) duplicate(Number(existing[0].Id));
    }
    throw error;
  }
}
export async function downloadReference(
  id: number,
): Promise<{ fileName: string; bytes: Buffer }> {
  const rows = await queryRowsWithParams<Row>(
    "SELECT FileName,Content FROM dbo.MarketReferences WHERE Id=@id",
    [int("id", id)],
  );
  if (!rows[0])
    throw new MarketRecordError(
      404,
      "reference_not_found",
      "Internal reference not found.",
    );
  if (!Buffer.isBuffer(rows[0].Content))
    throw new Error("Invalid stored reference bytes");
  return { fileName: String(rows[0].FileName), bytes: rows[0].Content };
}
