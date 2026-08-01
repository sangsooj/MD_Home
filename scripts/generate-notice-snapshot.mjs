import { access, writeFile } from "node:fs/promises";
import postgres from "postgres";

const outputPath = "notices/snapshot.js";
const connectionString =
  process.env.SUPABASE_DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

async function fromDatabase() {
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
    ssl: "require",
  });
  try {
    return await sql`
      SELECT id, category, title, excerpt, body_html, source, source_url,
             published_at, updated_at
      FROM board_posts
      WHERE category = 'notice' AND is_published = TRUE
      ORDER BY published_at DESC, id DESC
      LIMIT 50
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function fromPublicApi(baseUrl) {
  const listResponse = await fetch(`${baseUrl}/api/notices?page=1&limit=50`);
  if (!listResponse.ok) throw new Error(`notice list request failed: ${listResponse.status}`);
  const list = await listResponse.json();
  return Promise.all(list.posts.map(async (post) => {
    const detailResponse = await fetch(`${baseUrl}/api/notices/${post.id}`);
    if (!detailResponse.ok) throw new Error(`notice ${post.id} request failed: ${detailResponse.status}`);
    return { ...post, ...(await detailResponse.json()).post };
  }));
}

let posts;
if (connectionString) {
  posts = await fromDatabase();
} else if (process.env.SNAPSHOT_API_BASE) {
  posts = await fromPublicApi(process.env.SNAPSHOT_API_BASE.replace(/\/$/, ""));
} else {
  try {
    await access(outputPath);
    console.log("Notice snapshot preserved (no database configuration available).");
    process.exit(0);
  } catch {
    posts = [];
  }
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  posts,
};
await writeFile(outputPath, `window.__NOTICE_SNAPSHOT__=${JSON.stringify(snapshot)};\n`, "utf8");
console.log(`Generated notice snapshot with ${posts.length} posts.`);
