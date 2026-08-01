import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { ensureSchema, getSql } from "../../lib/db.js";
import { queryValue, sendError, setApiHeaders } from "../../lib/http.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const page = Math.max(1, Number.parseInt(queryValue(request.query.page) || "1", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(queryValue(request.query.limit) || "10", 10)));
    const offset = (page - 1) * limit;
    const search = queryValue(request.query.q).trim();

    const posts = search
      ? await sql`
          SELECT id, category, title, excerpt, source, source_url,
                 published_at, updated_at
          FROM board_posts
          WHERE category = 'notice' AND is_published = TRUE
            AND (title ILIKE ${`%${search}%`} OR excerpt ILIKE ${`%${search}%`})
          ORDER BY published_at DESC, id DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT id, category, title, excerpt, source, source_url,
                 published_at, updated_at
          FROM board_posts
          WHERE category = 'notice' AND is_published = TRUE
          ORDER BY published_at DESC, id DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    const countRows = search
      ? await sql`
          SELECT COUNT(*)::int AS total
          FROM board_posts
          WHERE category = 'notice' AND is_published = TRUE
            AND (title ILIKE ${`%${search}%`} OR excerpt ILIKE ${`%${search}%`})
        `
      : await sql`
          SELECT COUNT(*)::int AS total
          FROM board_posts
          WHERE category = 'notice' AND is_published = TRUE
        `;

    setApiHeaders(response);
    return response.status(200).json({
      ok: true,
      posts,
      pagination: { page, limit, total: Number(countRows[0]?.total ?? 0) },
    });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "공지사항을 불러오지 못했습니다.");
  }
}
