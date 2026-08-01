import type { VercelRequest, VercelResponse } from "./vercel.js";

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

export function isAuthorized(request: VercelRequest): boolean {
  const authorization = request.headers.authorization ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : queryValue(request.query.token);
  const allowed = [process.env.CRON_SECRET, process.env.ADMIN_TOKEN].filter(Boolean);
  return supplied.length > 0 && allowed.includes(supplied);
}
