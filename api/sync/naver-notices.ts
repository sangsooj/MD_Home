import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { ensureSchema, getSql } from "../../lib/db.js";
import { isAuthorized, sendError, setApiHeaders } from "../../lib/http.js";
import { fetchNoticeFeed, fetchNoticePost } from "../../lib/naver.js";
import { cacheNoticeImages } from "../../lib/notice-assets.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }
  if (!isAuthorized(request)) return sendError(response, 401, "동기화 권한이 없습니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    const feedItems = await fetchNoticeFeed();
    const result = {
      found: feedItems.length,
      imported: 0,
      updated: 0,
      unchanged: 0,
      imagesCached: 0,
      imagesFailed: 0,
      failed: [] as string[],
    };

    for (const item of feedItems) {
      try {
        const existing = await sql`
          SELECT p.id, p.content_hash, COUNT(a.id)::int AS asset_count
          FROM board_posts p
          LEFT JOIN board_post_assets a ON a.post_id = p.id
          WHERE p.source = 'naver' AND p.external_id = ${item.externalId}
          GROUP BY p.id, p.content_hash
          LIMIT 1
        `;
        const post = await fetchNoticePost(item);

        if (existing[0]?.content_hash === post.contentHash && Number(existing[0].asset_count) > 0) {
          await sql`
            UPDATE board_posts SET synced_at = NOW(), source_url = ${post.sourceUrl}
            WHERE source = 'naver' AND external_id = ${post.externalId}
          `;
          result.unchanged += 1;
          continue;
        }

        const saved = await sql`
          INSERT INTO board_posts (
            category, title, excerpt, body_html, source, external_id,
            source_url, published_at, synced_at, content_hash, is_published
          ) VALUES (
            'notice', ${post.title}, ${post.excerpt}, ${post.bodyHtml}, 'naver',
            ${post.externalId}, ${post.sourceUrl}, ${post.publishedAt.toISOString()},
            NOW(), ${post.contentHash}, TRUE
          )
          ON CONFLICT (source, external_id) DO UPDATE SET
            title = EXCLUDED.title,
            excerpt = EXCLUDED.excerpt,
            body_html = EXCLUDED.body_html,
            source_url = EXCLUDED.source_url,
            published_at = EXCLUDED.published_at,
            updated_at = NOW(),
            synced_at = NOW(),
            content_hash = EXCLUDED.content_hash,
            is_published = TRUE
          RETURNING id
        `;
        const postId = Number(saved[0].id);
        const cached = await cacheNoticeImages(sql, postId, post.bodyHtml, post.sourceUrl);
        result.imagesCached += cached.cached;
        result.imagesFailed += cached.failed;
        await sql`
          UPDATE board_posts SET body_html = ${cached.bodyHtml}, updated_at = NOW()
          WHERE id = ${postId}
        `;

        if (existing[0]?.content_hash === post.contentHash) result.unchanged += 1;
        else if (existing[0]) result.updated += 1;
        else result.imported += 1;
      } catch (error) {
        console.error(error);
        result.failed.push(item.externalId);
      }
    }

    setApiHeaders(response);
    return response.status(result.failed.length ? 207 : 200).json({ ok: result.failed.length === 0, result });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "네이버 공지 동기화에 실패했습니다.");
  }
}
