import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const connectionString =
    process.env.AZURE_SQL_CONNECTION_STRING ?? process.env.SQL_CONNECTION_STRING;
  if (!connectionString) throw new Error("Azure SQL connection string is not configured.");

  const requestedScript = process.argv[2] || "../db/schema.sql";
  const scriptUrl = new URL(requestedScript, import.meta.url);
  const script = await readFile(scriptUrl, "utf8");
  const batches = script
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
  const pool = await sql.connect(connectionString);
  try {
    for (const batch of batches) await pool.request().batch(batch);
    const verification = await pool.request().query(`
      SELECT COUNT(*) AS tableCount FROM sys.tables WHERE is_ms_shipped = 0;
      SELECT
        COL_LENGTH('dbo.Contracts', 'ProviderEnvelopeId') AS contractEnvelopeColumn,
        COL_LENGTH('dbo.Signatures', 'ProviderClientUserId') AS signerClientColumn,
        OBJECT_ID('dbo.SignatureWebhookEvents', 'U') AS webhookTableId;
    `);
    const recordsets = verification.recordsets as unknown as Array<Array<Record<string, unknown>>>;
    const tableCount = recordsets[0]?.[0]?.tableCount;
    const providerColumns = recordsets[1]?.[0];
    console.log(
      JSON.stringify({
        script: requestedScript,
        batchesApplied: batches.length,
        tableCount,
        contractEnvelopeColumn: providerColumns?.contractEnvelopeColumn,
        signerClientColumn: providerColumns?.signerClientColumn,
        webhookTablePresent: Boolean(providerColumns?.webhookTableId),
      }),
    );
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
