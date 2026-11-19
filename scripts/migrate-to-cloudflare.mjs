#!/usr/bin/env node
/**
 * Copy existing localhost database rows into the shared Cloudflare D1.
 *
 *   npm run migrate:cloudflare                 # write the rows
 *   npm run migrate:cloudflare -- --dry-run    # inspect without writing
 *
 * Requires `npx wrangler login` and a real database_id in wrangler.toml.
 *
 * Rows are copied with INSERT OR IGNORE, so production rows are never
 * overwritten — only missing projects, settings, requests and conversations are
 * added. Media files are stored in Backblaze B2 (not Cloudflare R2), so object
 * uploads are done from the dashboard or with the B2 S3 API; this script only
 * moves database rows that reference them.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");

const DB_NAME = process.env.D1_NAME || "portfolio-db";
const workDir = path.join(".wrangler", "migrate");
const dumpPath = path.join(workDir, "local-content.sql");

function wrangler(args, { allowFailure = false } = {}) {
  console.log(`\n$ npx wrangler ${args.join(" ")}`);
  const result = spawnSync("npx", ["wrangler", ...args], { stdio: "inherit", shell: true });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`wrangler ${args.join(" ")} exited with code ${result.status}`);
  }
  return result.status === 0;
}

function main() {
  if (!dryRun) {
    if (!wrangler(["whoami"], { allowFailure: true })) {
      throw new Error("Wrangler is not signed in. Run `npx wrangler login` first.");
    }
    console.log("\nApplying schema to the remote database…");
    wrangler(["d1", "execute", DB_NAME, "--remote", "--file", "worker/schema.sql"]);
  }

  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

  console.log("\nExporting the local database…");
  wrangler(["d1", "export", DB_NAME, "--local", "--no-schema", "--output", dumpPath]);

  const exported = readFileSync(dumpPath, "utf8");
  // Keep production rows that already exist; only fill in what is missing.
  const contentOnly = exported.replace(/INSERT INTO /g, "INSERT OR IGNORE INTO ");
  writeFileSync(dumpPath, contentOnly);

  const rowCount = (contentOnly.match(/INSERT OR IGNORE INTO/g) ?? []).length;
  console.log(`\nPrepared ${rowCount} row insert(s) from the local database.`);

  if (!dryRun) {
    console.log("\nWriting rows to the remote database…");
    wrangler(["d1", "execute", DB_NAME, "--remote", "--file", dumpPath]);
  }

  console.log("\n──────── migration summary ────────");
  console.log(`rows prepared: ${rowCount}`);
  console.log("media files  : stored in Backblaze B2 (upload through the dashboard)");
  console.log("\nNext: git push origin main, then reload the live site.");
}

try {
  main();
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
