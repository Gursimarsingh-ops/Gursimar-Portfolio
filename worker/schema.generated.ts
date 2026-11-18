// Generated from worker/schema.sql by scripts/build-schema.mjs. Do not edit by hand.
// Regenerate with: node scripts/build-schema.mjs

export const SCHEMA_STATEMENTS: readonly string[] = [
  "CREATE TABLE IF NOT EXISTS projects (\n  id TEXT PRIMARY KEY,\n  kind TEXT NOT NULL CHECK (kind IN ('graphic', 'video')),\n  title TEXT NOT NULL,\n  description TEXT NOT NULL DEFAULT '',\n  category TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),\n  asset_key TEXT NOT NULL,\n  asset_type TEXT NOT NULL DEFAULT '',\n  asset_size INTEGER NOT NULL DEFAULT 0,\n  asset_hash TEXT,\n  thumb_key TEXT,\n  thumb_type TEXT,\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);",
  "CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (status, kind, category);",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_asset_hash ON projects (asset_hash);",
  "CREATE TABLE IF NOT EXISTS upload_fingerprints (\n  hash TEXT PRIMARY KEY,\n  key TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);",
  "CREATE TABLE IF NOT EXISTS sessions (\n  token_hash TEXT PRIMARY KEY,\n  created_at TEXT NOT NULL,\n  expires_at TEXT NOT NULL\n);",
  "CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at);",
  "CREATE TABLE IF NOT EXISTS settings (\n  key TEXT PRIMARY KEY,\n  value TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);",
  "CREATE TABLE IF NOT EXISTS client_requests (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT NOT NULL,\n  company TEXT NOT NULL DEFAULT '',\n  discord TEXT NOT NULL DEFAULT '',\n  category TEXT NOT NULL,\n  budget TEXT NOT NULL,\n  description TEXT NOT NULL,\n  extra TEXT NOT NULL DEFAULT '',\n  deadline TEXT NOT NULL DEFAULT '',\n  reference_links TEXT NOT NULL DEFAULT '',\n  status TEXT NOT NULL DEFAULT 'new'\n    CHECK (status IN ('new', 'reviewed', 'discussion', 'accepted', 'rejected')),\n  admin_notes TEXT NOT NULL DEFAULT '',\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);",
  "CREATE INDEX IF NOT EXISTS idx_requests_created ON client_requests (created_at DESC);",
  "CREATE INDEX IF NOT EXISTS idx_requests_email ON client_requests (email);",
  "CREATE INDEX IF NOT EXISTS idx_requests_status ON client_requests (status);",
  "CREATE TABLE IF NOT EXISTS request_files (\n  id TEXT PRIMARY KEY,\n  request_id TEXT NOT NULL,\n  key TEXT NOT NULL,\n  name TEXT NOT NULL,\n  type TEXT NOT NULL DEFAULT '',\n  size INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL\n);",
  "CREATE INDEX IF NOT EXISTS idx_request_files_request ON request_files (request_id);",
  "CREATE TABLE IF NOT EXISTS conversations (\n  id TEXT PRIMARY KEY,\n  token_hash TEXT NOT NULL,\n  visitor_name TEXT NOT NULL,\n  visitor_email TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),\n  unread_admin INTEGER NOT NULL DEFAULT 0,\n  unread_visitor INTEGER NOT NULL DEFAULT 0,\n  visitor_last_seen TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL,\n  last_message_at TEXT\n);",
  "CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updated_at DESC);",
  "CREATE TABLE IF NOT EXISTS messages (\n  id TEXT PRIMARY KEY,\n  conversation_id TEXT NOT NULL,\n  sender TEXT NOT NULL CHECK (sender IN ('visitor', 'admin')),\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);",
  "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);",
  "CREATE TABLE IF NOT EXISTS ai_threads (\n  id TEXT PRIMARY KEY,\n  created_at TEXT NOT NULL,\n  last_seen_at TEXT NOT NULL,\n  message_count INTEGER NOT NULL DEFAULT 0\n);",
  "CREATE TABLE IF NOT EXISTS ai_messages (\n  id TEXT PRIMARY KEY,\n  thread_id TEXT NOT NULL,\n  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),\n  content TEXT NOT NULL,\n  attachments TEXT NOT NULL DEFAULT '[]',\n  created_at TEXT NOT NULL\n);",
  "CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_messages (thread_id, created_at);"
];
