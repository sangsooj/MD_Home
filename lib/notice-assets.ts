import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { Sql } from "postgres";

const MAX_IMAGES_PER_POST = 20;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export interface CachedNoticeBody {
  bodyHtml: string;
  cached: number;
  failed: number;
}

export async function cacheNoticeImages(
  sql: Sql,
  postId: number,
  bodyHtml: string,
  referer: string,
): Promise<CachedNoticeBody> {
  const $ = cheerio.load(bodyHtml, null, false);
  const images = $("img[src]").toArray().slice(0, MAX_IMAGES_PER_POST);
  let cached = 0;
  let failed = 0;

  for (const image of images) {
    const node = $(image);
    const sourceUrl = node.attr("src")?.trim();
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) continue;

    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "MathDoingNoticeSync/2.0 (+https://www.mathdoing.com)",
          Referer: referer,
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`image request failed: ${response.status}`);

      const mimeType = (response.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(mimeType)) throw new Error(`unsupported image type: ${mimeType}`);
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_IMAGE_BYTES) throw new Error("image is too large");

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("invalid image size");
      const hash = createHash("sha256").update(bytes).digest("hex");
      const rows = await sql`
        INSERT INTO board_post_assets (post_id, source_url, mime_type, content, content_hash)
        VALUES (${postId}, ${sourceUrl}, ${mimeType}, ${bytes}, ${hash})
        ON CONFLICT (post_id, source_url) DO UPDATE SET
          mime_type = EXCLUDED.mime_type,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          updated_at = NOW()
        RETURNING id
      `;
      node.attr("src", `/api/notice-assets/${rows[0].id}?v=${hash.slice(0, 16)}`);
      node.removeAttr("srcset").removeAttr("data-src").removeAttr("data-lazy-src");
      cached += 1;
    } catch (error) {
      console.error(`Failed to cache notice image for post ${postId}:`, error);
      failed += 1;
    }
  }

  return { bodyHtml: $.html().trim(), cached, failed };
}
