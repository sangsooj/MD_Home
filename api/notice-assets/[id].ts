import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { ensureSchema, getSql } from "../../lib/db.js";
import { queryValue, sendError } from "../../lib/http.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }

  const id = Number.parseInt(queryValue(request.query.id), 10);
  if (!Number.isSafeInteger(id) || id < 1) return sendError(response, 400, "올바르지 않은 이미지 번호입니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT mime_type, content, content_hash
      FROM board_post_assets
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return sendError(response, 404, "이미지를 찾을 수 없습니다.");

    response.statusCode = 200;
    response.setHeader("Content-Type", String(rows[0].mime_type));
    response.setHeader("Content-Length", String(rows[0].content.length));
    response.setHeader("ETag", `"${rows[0].content_hash}"`);
    response.setHeader("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
    response.end(rows[0].content);
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "이미지를 불러오지 못했습니다.");
  }
}
