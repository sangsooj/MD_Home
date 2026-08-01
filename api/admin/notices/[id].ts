import type { VercelRequest, VercelResponse } from "../../../lib/vercel.js";
import { ensureSchema, getSql } from "../../../lib/db.js";
import { isAuthorized, queryValue, sendError, setApiHeaders } from "../../../lib/http.js";
import { htmlToPlainText, sanitizeBodyHtml } from "../../../lib/sanitize.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "PATCH" && request.method !== "DELETE") {
    response.setHeader("Allow", "PATCH, DELETE");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }
  if (!isAuthorized(request)) return sendError(response, 401, "관리자 권한이 없습니다.");

  const id = Number.parseInt(queryValue(request.query.id), 10);
  if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, "올바르지 않은 글 번호입니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    if (request.method === "DELETE") {
      const rows = await sql`
        UPDATE board_posts SET is_published = FALSE, updated_at = NOW()
        WHERE id = ${id} AND source = 'website' RETURNING id
      `;
      if (!rows[0]) return sendError(response, 404, "공지사항을 찾을 수 없습니다.");
      setApiHeaders(response);
      return response.status(200).json({ ok: true, id });
    }

    const title = typeof request.body?.title === "string" ? request.body.title.trim() : "";
    const rawBody = typeof request.body?.bodyHtml === "string" ? request.body.bodyHtml : "";
    const bodyHtml = sanitizeBodyHtml(rawBody);
    const excerpt = htmlToPlainText(bodyHtml).slice(0, 180);
    if (!title || !bodyHtml) return sendError(response, 400, "제목과 본문은 필수입니다.");

    const rows = await sql`
      UPDATE board_posts
      SET title = ${title}, excerpt = ${excerpt}, body_html = ${bodyHtml}, updated_at = NOW()
      WHERE id = ${id} AND source = 'website'
      RETURNING id, title, updated_at
    `;
    if (!rows[0]) return sendError(response, 404, "직접 등록한 홈페이지 공지사항을 찾을 수 없습니다.");
    setApiHeaders(response);
    return response.status(200).json({ ok: true, post: rows[0] });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "공지사항을 변경하지 못했습니다.");
  }
}
