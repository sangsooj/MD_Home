import type { VercelRequest, VercelResponse } from "./vercel.js";
import { hasAdminSession } from "./auth.js";

export function setApiHeaders(response: VercelResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
}

export function sendError(
  response: VercelResponse,
  status: number,
  message: string,
): void {
  setApiHeaders(response);
  response.status(status).json({ ok: false, error: message });
}

export function queryValue(value: VercelRequest["query"][string]): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

/**
 * 관리자 권한 확인.
 * 원장님 화면은 로그인 세션 쿠키를 쓰고, 동기화 작업 같은 기계 호출은 토큰을 쓴다.
 */
export function isAuthorized(request: VercelRequest): boolean {
  if (hasAdminSession(request)) return true;

  const authorization = request.headers.authorization ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : queryValue(request.query.token);
  const allowed = [process.env.CRON_SECRET, process.env.ADMIN_TOKEN].filter(Boolean);
  return supplied.length > 0 && allowed.includes(supplied);
}
