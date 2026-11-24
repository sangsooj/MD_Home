import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { sendError, setApiHeaders } from "../../lib/http.js";
import {
  createSessionValue, hasAdminSession, isSetupCode, loadAccount, passwordProblem,
  savePassword, setSessionCookie, verifyPassword,
} from "../../lib/auth.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }

  const next = typeof request.body?.password === "string" ? request.body.password : "";
  const problem = passwordProblem(next);
  if (problem) return sendError(response, 400, problem);

  try {
    const account = await loadAccount();

    if (!account.password_hash || !account.password_salt) {
      // 최초 설정: 설치 코드를 한 번 확인한다.
      if (!isSetupCode(request.body?.setupCode)) {
        return sendError(response, 401, "설치 코드가 맞지 않습니다.");
      }
      await savePassword(next);
      setSessionCookie(response, createSessionValue());
      setApiHeaders(response);
      return response.status(200).json({ ok: true, signedIn: true, created: true });
    }

    // 변경: 로그인되어 있고 현재 비밀번호를 알아야 한다.
    if (!hasAdminSession(request)) return sendError(response, 401, "관리자 권한이 없습니다.");
    const current = typeof request.body?.currentPassword === "string" ? request.body.currentPassword : "";
    const matches = await verifyPassword(current, account.password_hash, account.password_salt);
    if (!matches) return sendError(response, 401, "현재 비밀번호가 맞지 않습니다.");

    await savePassword(next);
    setSessionCookie(response, createSessionValue());
    setApiHeaders(response);
    return response.status(200).json({ ok: true, signedIn: true, created: false });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "비밀번호를 저장하지 못했습니다.");
  }
}
