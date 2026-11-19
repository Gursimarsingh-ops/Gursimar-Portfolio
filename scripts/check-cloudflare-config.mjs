#!/usr/bin/env node
/**
 * Pre-deploy sanity check for the production Cloudflare Pages project.
 *
 *   node scripts/check-cloudflare-config.mjs
 *
 * Exits non-zero while the project is still wired to the placeholder database
 * id, so neither a manual deploy nor a Git build can ship a site whose
 * dashboard silently writes nowhere. Never prints secret values.
 */
import { existsSync, readFileSync } from "node:fs";

const PLACEHOLDER_DB = "00000000-0000-4000-8000-000000000000";
const problems = [];
const notes = [];

function read(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

const toml = read("wrangler.toml");
if (toml === null) {
  console.error("✖ wrangler.toml is missing.");
  process.exit(1);
}

const databaseId = (toml.match(/database_id\s*=\s*"([^"]*)"/) ?? [])[1] ?? "";
if (!databaseId) {
  problems.push('wrangler.toml has no database_id. Run `npx wrangler d1 create portfolio-db` and paste the id.');
} else if (databaseId === PLACEHOLDER_DB || /^0{8}-/.test(databaseId)) {
  problems.push(
    "wrangler.toml still uses the placeholder D1 database_id. Run `npx wrangler d1 create portfolio-db` (or `npx wrangler d1 list`) and put the real id there."
  );
}

if (!/pages_build_output_dir\s*=\s*"\.\/dist"/.test(toml)) {
  problems.push('wrangler.toml must set pages_build_output_dir = "./dist" for the Pages build.');
}
// R2 must stay out of the Pages config: an R2 binding fails the whole Function
// publish when the account has no R2 subscription. Storage is Backblaze B2.
if (/\[\[r2_buckets\]\]/.test(toml) || /portfolio-media/.test(toml)) {
  problems.push(
    "wrangler.toml still declares the R2 binding (portfolio-media). Remove [[r2_buckets]] — storage is Backblaze B2 only."
  );
}
if (!/binding\s*=\s*"DB"/.test(toml)) problems.push('wrangler.toml needs the D1 binding named "DB".');
for (const name of ["B2_BUCKET_NAME", "B2_REGION", "B2_ENDPOINT"]) {
  if (!new RegExp(`^${name}\\s*=`, "m").test(toml)) {
    problems.push(`wrangler.toml is missing the ${name} variable required by the B2 storage backend.`);
  }
}

// The Pages backend only exists if the Functions adapters are in the repo.
for (const file of ["functions/api/[[path]].ts", "functions/media/[[path]].ts", "public/_routes.json"]) {
  if (!existsSync(file)) problems.push(`Missing ${file} — Pages would serve the SPA without a backend.`);
}

const workerConfig = read("wrangler.worker.toml");
if (workerConfig === null) {
  notes.push("wrangler.worker.toml is missing: `npm run dev:api` will not share production D1 + B2.");
}

if (!existsSync(".dev.vars")) {
  notes.push("No .dev.vars: `npm run dev:api` will not have administrator credentials (production secrets are set separately).");
} else {
  const devVars = read(".dev.vars");
  if (!/^ADMIN_EMAIL=.+/m.test(devVars)) notes.push(".dev.vars has no ADMIN_EMAIL.");
  if (!/^ADMIN_PASSWORD_HASH=pbkdf2:\d+:[^:]+:.+/m.test(devVars)) {
    notes.push(
      '.dev.vars ADMIN_PASSWORD_HASH is missing or malformed. Generate it with `node scripts/hash-admin-password.mjs "<password>"`.'
    );
  }
  notes.push(
    "Local sign-in uses .dev.vars; production uses Pages secrets. If they hold different values, localhost sign-in succeeds and the live sign-in fails."
  );
}

console.log("Cloudflare Pages configuration check\n");

if (notes.length) {
  for (const note of notes) console.log(`• ${note}`);
  console.log("");
}

if (problems.length) {
  console.error("✖ Not ready:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(`
Required steps (Cloudflare dashboard or wrangler):

  1. npx wrangler login
  2. npx wrangler d1 create portfolio-db        # copy database_id into wrangler.toml
  3. Pages → gursimar-portfolio → Settings → Functions → Bindings
       DB = D1 database portfolio-db      (no R2 binding is needed or allowed)
  4. npx wrangler d1 execute portfolio-db --remote --file worker/schema.sql
  5. Pages → Settings → Variables and Secrets (Production)
       B2_BUCKET_NAME, B2_REGION, B2_ENDPOINT   (plain variables)
       B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY (secrets)
       ADMIN_EMAIL, ADMIN_PASSWORD_HASH, AI_API_KEY (optional)
  6. npm run migrate:cloudflare                  # copy existing local database rows up
  7. git push origin main                        # Pages builds and deploys

See ADMIN_SETUP.md → "Production deployment".`);
  process.exit(1);
}

console.log("✔ Pages config, D1 binding, B2 variables and Functions adapters look correct.");
console.log("  Next: npm run db:remote (schema), npm run migrate:cloudflare (rows), git push origin main.");
