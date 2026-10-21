/** Read-only validation of coordinator review artifacts. Never enrolls source data. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseDemoPlaylistPlan } from "./demo-playlist-domain.js";
const files = process.argv.slice(2);
if (!files.length) throw new Error("Provide explicit reviewed plan file paths.");
for (const file of files) {
  const bytes = await readFile(file);
  const plan = parseDemoPlaylistPlan(JSON.parse(bytes.toString("utf8")));
  console.log(JSON.stringify({ file, sha256: createHash("sha256").update(bytes).digest("hex"), counts: plan.detail.counts, primaryCompanies: plan.detail.companies.filter(c => c.membership === "primary").length, sources: plan.sources.length, relationships: plan.detail.relationships.length, valid: true }));
}
