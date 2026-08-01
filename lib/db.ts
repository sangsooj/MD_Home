import postgres, { type Sql } from "postgres";

let sqlClient: Sql | undefined;
let schemaReady: Promise<void> | undefined;

export function getSql(): Sql {
  const connectionString =
    process.env.SUPABASE_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DATABASE_URL 환경변수가 설정되지 않았습니다.");
  }

  if (!sqlClient) {
    sqlClient = postgres(connectionString, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: "require",
    });
  }
  return sqlClient;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
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
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS board_posts_public_list_idx
        ON board_posts (category, is_published, published_at DESC)
      `;
      await sql`ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY`;
      await sql`REVOKE ALL ON TABLE board_posts FROM anon, authenticated`;
      await sql`REVOKE ALL ON SEQUENCE board_posts_id_seq FROM anon, authenticated`;
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }

  return schemaReady;
}
