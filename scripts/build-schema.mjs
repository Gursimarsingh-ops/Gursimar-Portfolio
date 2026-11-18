#!/usr/bin/env node
/**
 * Embeds worker/schema.sql into worker/schema.generated.ts so the deployed
 * Functions bundle can create missing tables at runtime (Workers have no fs).
 *
 *   node scripts/build-schema.mjs
 *
 * Runs automatically before `npm run build`, so schema.sql stays the single
 * source of truth and the generated module can never drift from it.
 *
 * The SQL is emitted as one statement per array entry: D1's `exec()` treats
 * the blob as line-oriented and fails on `--` comments ("incomplete input"),
 * so the runtime executes prepared statements instead.
 */
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("worker/schema.sql", "utf8");

const statements = source
  // Drop `--` comments (including trailing ones) before splitting.
  .replace(/--[^\n]*/g, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean)
  .map((statement) => `${statement};`);

const header =
  "// Generated from worker/schema.sql by scripts/build-schema.mjs. Do not edit by hand.\n" +
  "// Regenerate with: node scripts/build-schema.mjs\n\n";

writeFileSync(
  "worker/schema.generated.ts",
  `${header}export const SCHEMA_STATEMENTS: readonly string[] = ${JSON.stringify(statements, null, 2)};\n`,
  "utf8"
);

console.log(
  `worker/schema.generated.ts written (${statements.length} statements from ${source.length} bytes of SQL).`
);
