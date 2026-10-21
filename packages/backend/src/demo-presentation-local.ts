import assert from "node:assert/strict";
import { queryRowsWithParams } from "./database.js";

/** Refuse every database except the caller's verified dedicated loopback Orca SQL. */
export async function requireLocalPresentationDatabase() {
  const database = process.env.ORCA_SQL_DATABASE;
  const marker = process.env.ORCA_SQL_MARKER;
  const connection = process.env.AZURE_SQL_CONNECTION_STRING ?? "";
  assert.match(database ?? "", /^eco_[a-f0-9]{24}$/u);
  assert.match(marker ?? "", /^[a-f0-9]{64}$/u);
  assert.match(connection, /^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/u);
  const identity = await queryRowsWithParams<{ name: string; token: string }>("SELECT DB_NAME() name,Token token FROM dbo.OrcaOwner");
  assert.equal(identity.length, 1);
  assert.equal(identity[0]?.name, database);
  assert.equal(identity[0]?.token, marker);
}
