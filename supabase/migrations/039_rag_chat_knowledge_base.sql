-- RAG knowledge base + chat persistence.
-- All access goes through the BE's own service connection (no Supabase SDK on
-- the frontend, same convention as meta_capi_sent) — RLS enabled, no policies.

-- Supabase installs extensions into the `extensions` schema, not `public` —
-- an unqualified `vector` type reference fails with "type vector does not
-- exist" once outside a session whose search_path happens to include it
-- (this bit us on the first production apply attempt). Schema-qualify both
-- the type and the operator class explicitly rather than relying on
-- search_path.
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE kb_source_type AS ENUM ('product', 'policy', 'faq');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE chat_role AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type kb_source_type NOT NULL,
  source_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  embedding extensions.vector(1024) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kb_chunks IS
  'RAG knowledge base for the customer chatbot — one row per embedded chunk (product, policy, or FAQ). embedding is voyage-3 (1024-dim).';

-- One product -> one chunk today, upserted by source_id on re-embed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_chunks_product_source ON kb_chunks (source_id)
  WHERE source_type = 'product';

CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding ON kb_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
-- No policies: only the BE's service connection reads/writes this table.

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  intent_summary TEXT,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conversations IS
  'Chat conversations. user_id is null for guests. last_activity_at drives retention: guests are cleaned up after 48h, users after 90d (see /internal/chat/cleanup).';

CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations (last_activity_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS
  'Individual chat turns. Cascade-deletes with its conversation — no separate cleanup needed.';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
