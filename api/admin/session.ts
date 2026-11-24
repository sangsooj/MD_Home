import type { VercelRequest, VercelResponse } from "../../lib/vercel.js";
import { sendError, setApiHeaders } from "../../lib/http.js";
import {
  ADMIN_ID, hasAdminSession, isLocked, loadAccount, recordFailure, recordSuccess,
  createSessionValue, setSessionCookie, verifyPassword,
} from "../../lib/auth.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!["GET", "POST", "DELETE"].includes(request.method ?? "")) {
    response.setHeader("Allow", "GET, POST, DELETE");
    return sendError(response, 405, "지원하지 않는 요청 방식입니다.");
  }

  try {
    if (request.method === "DELETE") {
      setSessionCookie(response, null);
      setApiHeaders(response);
      return response.status(200).json({ ok: true, signedIn: false });
    }

    const account = await loadAccount();

    if (request.method === "GET") {
      setApiHeaders(response);
      return response.status(200).json({
        ok: true,
        adminId: ADMIN_ID,
        passwordSet: Boolean(account.password_hash),
        signedIn: hasAdminSession(request),
      });
    }

    const id = typeof request.body?.id === "string" ? request.body.id.trim() : "";
    const password = typeof request.body?.password === "string" ? request.body.password : "";
    if (!id || !password) return sendError(response, 400, "아이디와 비밀번호를 모두 입력해 주세요.");

    if (!account.password_hash || !account.password_salt) {
      return sendError(response, 409, "아직 비밀번호가 설정되지 않았습니다. 최초 설정을 먼저 해 주세요.");
    }
    if (isLocked(account)) {
      return sendError(response, 429, "로그인 시도가 많아 잠시 잠겼습니다. 10분 뒤에 다시 시도해 주세요.");
    }

    const idMatches = id === ADMIN_ID;
    const passwordMatches = await verifyPassword(password, account.password_hash, account.password_salt);
    if (!idMatches || !passwordMatches) {
      await recordFailure(account);
      return sendError(response, 401, "아이디 또는 비밀번호가 맞지 않습니다.");
    }

    await recordSuccess();
    setSessionCookie(response, createSessionValue());
    setApiHeaders(response);
    return response.status(200).json({ ok: true, signedIn: true });
  } catch (error) {
    console.error(error);
    return sendError(response, 500, "로그인을 처리하지 못했습니다.");
  }
}
