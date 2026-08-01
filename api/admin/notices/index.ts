import type { VercelRequest, VercelResponse } from "../../../lib/vercel.js";
import sanitizeHtml from "sanitize-html";
import { ensureSchema, getSql } from "../../../lib/db.js";
import { isAuthorized, sendError, setApiHeaders } from "../../../lib/http.js";

function sanitizeBody(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption", "h2", "h3"]),
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "loading"] },
    allowedSchemes: ["https", "http"],
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }
  if (!isAuthorized(request)) return sendError(response, 401, "관리자 권한이 없습니다.");

  const title = typeof request.body?.title === "string" ? request.body.title.trim() : "";
  const rawBody = typeof request.body?.bodyHtml === "string" ? request.body.bodyHtml : "";
  const bodyHtml = sanitizeBody(rawBody).trim();
  const excerptInput = typeof request.body?.excerpt === "string" ? request.body.excerpt.trim() : "";
  const excerpt = excerptInput || sanitizeHtml(bodyHtml, { allowedTags: [] }).replace(/\s+/g, " ").trim().slice(0, 180);
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
