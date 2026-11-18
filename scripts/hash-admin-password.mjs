#!/usr/bin/env node
/**
 * Generates the ADMIN_PASSWORD_HASH secret for the portfolio backend.
 *
 *   node scripts/hash-admin-password.mjs "your-strong-password"
 *
 * Copy the printed value into:
 *   - production: `wrangler secret put ADMIN_PASSWORD_HASH`
 *   - local dev:  .dev.vars (never commit that file)
 *
 * The `:` separator is deliberate: dotenv-style .dev.vars files expand `$VAR`
 * sequences, which corrupts a `pbkdf2$...` hash in local development.
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error("Usage: node scripts/hash-admin-password.mjs \"<password of at least 10 characters>\"");
  process.exit(1);
}

// Cloudflare Workers rejects PBKDF2 above 100,000 iterations, so stay at the cap.
const iterations = 100000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");

console.log(`pbkdf2:${iterations}:${salt.toString("base64")}:${hash.toString("base64")}`);
