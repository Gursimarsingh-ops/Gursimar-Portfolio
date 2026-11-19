-- Portfolio content managed through /admin
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('graphic', 'video')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  asset_key TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT '',
  asset_size INTEGER NOT NULL DEFAULT 0,
  asset_hash TEXT,
  thumb_key TEXT,
  thumb_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_ratio TEXT,
  asset_width INTEGER,
  asset_height INTEGER,
  duration_seconds REAL,
  source_url TEXT,
  thumb_style TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (status, kind, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_asset_hash ON projects (asset_hash);

-- Fingerprints of every uploaded asset so identical files are rejected before publishing.
CREATE TABLE IF NOT EXISTS upload_fingerprints (
  hash TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Opaque admin sessions. Only the SHA-256 hash of the cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at);

-- Durable site settings (maintenance mode, availability, AI configuration).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Hire Me / Project Inquiry submissions. Every request gets a server-generated id.
CREATE TABLE IF NOT EXISTS client_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  discord TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  budget TEXT NOT NULL,
  description TEXT NOT NULL,
  extra TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  reference_links TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'discussion', 'accepted', 'rejected')),
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_created ON client_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_email ON client_requests (email);
CREATE INDEX IF NOT EXISTS idx_requests_status ON client_requests (status);

-- Private attachments for a request. Stored in R2 and only served behind an admin session.
CREATE TABLE IF NOT EXISTS request_files (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_files_request ON request_files (request_id);

-- Live conversations with the owner. The visitor keeps an opaque token; only its
-- SHA-256 hash is stored, so a leaked database row cannot be used to read a thread.
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_visitor INTEGER NOT NULL DEFAULT 0,
  visitor_last_seen TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('visitor', 'admin')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- AI assistant threads: the browser keeps an opaque thread id, history stays server-side.
CREATE TABLE IF NOT EXISTS ai_threads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_messages (thread_id, created_at);
