import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { ensureSchema, getSql } from "../../lib/db.js";
import { isAuthorized, queryValue, sendError, setApiHeaders } from "../../lib/http.js";

/** 수정 화면에서 쓸 본문 한 건. */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }
  if (!isAuthorized(request)) return sendError(response, 401, "관리자 권한이 없습니다.");

  const id = Number.parseInt(queryValue(request.query.id), 10);
  if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, "올바르지 않은 글 번호입니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, title, excerpt, body_html, source, source_url, is_published, published_at, updated_at
      FROM board_posts WHERE id = ${id} AND category = 'notice'
    `;
    if (!rows[0]) return sendError(response, 404, "글을 찾을 수 없습니다.");
    setApiHeaders(response);
    return response.status(200).json({ ok: true, post: rows[0] });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "글을 불러오지 못했습니다.");
  }
}
