import type { VercelRequest, VercelResponse } from "../../../lib/vercel.js";
import { ensureSchema, getSql } from "../../../lib/db.js";
import { isAuthorized, sendError, setApiHeaders } from "../../../lib/http.js";
import { htmlToPlainText, sanitizeBodyHtml } from "../../../lib/sanitize.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }
  if (!isAuthorized(request)) return sendError(response, 401, "관리자 권한이 없습니다.");

  const title = typeof request.body?.title === "string" ? request.body.title.trim() : "";
  const rawBody = typeof request.body?.bodyHtml === "string" ? request.body.bodyHtml : "";
  const bodyHtml = sanitizeBodyHtml(rawBody);
  const excerptInput = typeof request.body?.excerpt === "string" ? request.body.excerpt.trim() : "";
  const excerpt = excerptInput || htmlToPlainText(bodyHtml).slice(0, 180);
  if (!title || !bodyHtml) return sendError(response, 400, "제목과 본문은 필수입니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      INSERT INTO board_posts (category, title, excerpt, body_html, source, published_at)
      VALUES ('notice', ${title}, ${excerpt}, ${bodyHtml}, 'website', NOW())
      RETURNING id, title, published_at
    `;
    setApiHeaders(response);
    return response.status(201).json({ ok: true, post: rows[0] });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "공지사항을 등록하지 못했습니다.");
  }
}
