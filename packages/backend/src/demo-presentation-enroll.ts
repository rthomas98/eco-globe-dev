import { readFile } from "node:fs/promises";
import { requireLocalPresentationDatabase } from "./demo-presentation-local.js";
import { enrollDemoPresentations } from "./demo-presentation-store.js";
import { sql } from "./database.js";

let localConnection: string | undefined;
try {
  if (process.argv.length !== 3) throw new Error("Expected one reviewed presentation plan file.");
  await requireLocalPresentationDatabase();
  localConnection = process.env.AZURE_SQL_CONNECTION_STRING;
  const plan: unknown = JSON.parse(await readFile(process.argv[2]!, "utf8"));
  console.log(JSON.stringify(await enrollDemoPresentations(plan)));
} catch {
  console.error("Presentation enrollment refused; verify the local database and reviewed plan.");
  process.exitCode = 1;
} finally {
  if (localConnection) await (await sql.connect(localConnection)).close();
}
