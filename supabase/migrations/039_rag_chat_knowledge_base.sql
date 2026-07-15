-- RAG knowledge base + chat persistence.
-- All access goes through the BE's own service connection (no Supabase SDK on
-- the frontend, same convention as meta_capi_sent) — RLS enabled, no policies.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE kb_source_type AS ENUM ('product', 'policy', 'faq');
CREATE TYPE chat_role AS ENUM ('user', 'assistant');

CREATE TABLE kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type kb_source_type NOT NULL,
  source_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1024) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kb_chunks IS
  'RAG knowledge base for the customer chatbot — one row per embedded chunk (product, policy, or FAQ). embedding is voyage-3 (1024-dim).';

-- One product -> one chunk today, upserted by source_id on re-embed.
CREATE UNIQUE INDEX idx_kb_chunks_product_source ON kb_chunks (source_id)
  WHERE source_type = 'product';

CREATE INDEX idx_kb_chunks_embedding ON kb_chunks
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
-- No policies: only the BE's service connection reads/writes this table.

CREATE TABLE conversations (
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

CREATE INDEX idx_conversations_session ON conversations (session_id);
CREATE INDEX idx_conversations_user ON conversations (user_id);
CREATE INDEX idx_conversations_last_activity ON conversations (last_activity_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS
  'Individual chat turns. Cascade-deletes with its conversation — no separate cleanup needed.';

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
