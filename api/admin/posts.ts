import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { ensureSchema, getSql } from "../../lib/db.js";
import { isAuthorized, queryValue, sendError, setApiHeaders } from "../../lib/http.js";

/** 관리자용 목록: 숨긴 글과 네이버에서 들어온 글까지 모두 보여 준다. */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }
  if (!isAuthorized(request)) return sendError(response, 401, "관리자 권한이 없습니다.");

  try {
    await ensureSchema();
    const sql = getSql();
    const page = Math.max(1, Number.parseInt(queryValue(request.query.page) || "1", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(queryValue(request.query.limit) || "20", 10)));
    const offset = (page - 1) * limit;

    const posts = await sql`
      SELECT id, title, excerpt, source, source_url, is_published, published_at, updated_at
      FROM board_posts
      WHERE category = 'notice'
      ORDER BY published_at DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countRows = await sql`
      SELECT COUNT(*)::int AS total FROM board_posts WHERE category = 'notice'
    `;

    setApiHeaders(response);
    return response.status(200).json({
      ok: true,
      posts,
      pagination: { page, limit, total: Number(countRows[0]?.total ?? 0) },
    });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "글 목록을 불러오지 못했습니다.");
  }
}
