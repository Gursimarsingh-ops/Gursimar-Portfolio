import { SCHEMA_STATEMENTS } from "./schema.generated";

/**
 * Tables the backend needs. A brand-new D1 database has none of them, and the
 * login handler used to insert into a missing `sessions` table, which surfaced
 * in the browser as an opaque HTTP 500 even with correct credentials.
 *
 * Every /api request now verifies the schema once per isolate and applies
 * worker/schema.sql when anything is missing, so a fresh database, a recreated
 * database or a reset one still signs in successfully.
 */
export const REQUIRED_TABLES = [
  "projects",
  "upload_fingerprints",
  "sessions",
  "settings",
  "client_requests",
  "request_files",
  "conversations",
  "messages",
  "ai_threads",
  "ai_messages",
] as const;

let ready: Promise<boolean> | null = null;

/**
 * Resolves true when the tables are present and queryable, false when the
 * database is missing, unreachable or could not be initialized. Callers turn
 * false into an actionable 503 instead of leaking a 500.
 */
export function ensureSchema(env: { DB?: D1Database }): Promise<boolean> {
  const db = env.DB;
  if (!db) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      const { results } = await db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all<{ name: string }>();
      const present = new Set((results ?? []).map((row) => row.name));
      if (REQUIRED_TABLES.every((table) => present.has(table))) return true;

      const missing = REQUIRED_TABLES.filter((table) => !present.has(table));
      console.warn(`Initializing missing D1 tables: ${missing.join(", ")}`);

      // Prepared statements, not exec(): D1's exec() is line-oriented and fails
      // on the `--` comments in schema.sql with "incomplete input".
      for (const statement of SCHEMA_STATEMENTS) {
        await db.prepare(statement).run();
      }

      const after = await db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all<{ name: string }>();
      const created = new Set((after.results ?? []).map((row) => row.name));
      const stillMissing = REQUIRED_TABLES.filter((table) => !created.has(table));
      if (stillMissing.length) {
        throw new Error(`D1 schema incomplete, missing: ${stillMissing.join(", ")}`);
      }
      return true;
    })().catch((error) => {
      // Let the next request retry instead of caching the failure for the isolate's life.
      ready = null;
      console.error("Schema bootstrap failed", error instanceof Error ? error.message : String(error));
      return false;
    });
  }
  return ready;
}
