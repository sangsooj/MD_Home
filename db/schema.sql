CREATE TABLE IF NOT EXISTS board_posts (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'notice',
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  external_id TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  content_hash TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT board_posts_source_external_id_key UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS board_posts_public_list_idx
  ON board_posts (category, is_published, published_at DESC);

ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE board_posts FROM anon, authenticated;
REVOKE ALL ON SEQUENCE board_posts_id_seq FROM anon, authenticated;
