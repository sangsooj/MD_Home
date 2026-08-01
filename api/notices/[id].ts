import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { ensureSchema, getSql } from "../../lib/db.js";
import { queryValue, sendError, setApiHeaders } from "../../lib/http.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }

  const id = Number.parseInt(queryValue(request.query.id), 10);
  if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, "올바르지 않은 글 번호입니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    const posts = await sql`
      SELECT id, category, title, body_html, source, source_url,
             published_at, updated_at
      FROM board_posts
      WHERE id = ${id} AND category = 'notice' AND is_published = TRUE
      LIMIT 1
    `;

    if (!posts[0]) return sendError(response, 404, "공지사항을 찾을 수 없습니다.");
    setApiHeaders(response);
    return response.status(200).json({ ok: true, post: posts[0] });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "공지사항을 불러오지 못했습니다.");
  }
}
