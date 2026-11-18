#!/usr/bin/env node
/**
 * Copy existing localhost content into the shared Cloudflare D1 + R2.
 *
 *   npm run migrate:cloudflare            # upload everything
 *   npm run migrate:cloudflare -- --dry-run   # inspect without writing
 *   npm run migrate:cloudflare -- --skip-r2   # database rows only
 *
 * Requires `npx wrangler login` and a real database_id in wrangler.toml.
 *
 * Database rows are copied with INSERT OR IGNORE, so production rows are never
 * overwritten — only missing projects, settings, requests and conversations are
 * added. R2 objects are uploaded with their original keys, so every project
 * record keeps pointing at a readable file.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const skipR2 = flags.has("--skip-r2");

const DB_NAME = process.env.D1_NAME || "portfolio-db";
const BUCKET = process.env.R2_BUCKET || "portfolio-media";
const workDir = path.join(".wrangler", "migrate");
const dumpPath = path.join(workDir, "local-content.sql");

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function wrangler(args, { allowFailure = false } = {}) {
  console.log(`\n$ npx wrangler ${args.join(" ")}`);
  const result = spawnSync("npx", ["wrangler", ...args], { stdio: "inherit", shell: true });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`wrangler ${args.join(" ")} exited with code ${result.status}`);
  }
  return result.status === 0;
}

function contentTypeFor(key) {
  const ext = (key.split(".").pop() || "").toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
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

  if (skipR2) {
    console.log("\n--skip-r2: object upload skipped.");
    return;
  }

  const keys = [
    ...new Set(contentOnly.match(/(?:graphics|videos|thumbs|artist|requests|ai)\/[A-Za-z0-9._-]+/g) ?? []),
  ].sort();

  console.log(`\nFound ${keys.length} stored object(s) referenced by the database.`);

  if (dryRun) {
    for (const key of keys) console.log(`  would upload ${BUCKET}/${key}`);
    return;
  }

  let copied = 0;
  const failed = [];

  for (const key of keys) {
    const localFile = path.join(workDir, `object-${copied}${path.extname(key) || ".bin"}`);
    const got = wrangler(["r2", "object", "get", `${BUCKET}/${key}`, "--local", "--file", localFile], {
      allowFailure: true,
    });
    if (!got || !existsSync(localFile)) {
      failed.push(`${key} (not in local storage)`);
      rmSync(localFile, { force: true });
      continue;
    }

    const put = wrangler(
      [
        "r2",
        "object",
        "put",
        `${BUCKET}/${key}`,
        "--remote",
        "--file",
        localFile,
        "--content-type",
        contentTypeFor(key),
      ],
      { allowFailure: true }
    );

    rmSync(localFile, { force: true });
    if (put) copied += 1;
    else failed.push(`${key} (upload rejected)`);
  }

  console.log("\n──────── migration summary ────────");
  console.log(`rows prepared : ${rowCount}`);
  console.log(`objects copied: ${copied}/${keys.length}`);
  if (failed.length) {
    console.log(`failed        : ${failed.length}`);
    for (const item of failed) console.log(`  - ${item}`);
    console.log("\nRe-run after fixing these, or upload them manually:\n  npx wrangler r2 object put " + BUCKET + "/<key> --remote --file=<file>");
  } else {
    console.log("failed        : 0");
  }
  console.log("\nNext: npm run deploy, then reload the live site.");
}

try {
  main();
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
