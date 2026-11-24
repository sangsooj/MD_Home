import {
  createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";
import type { VercelRequest, VercelResponse } from "./vercel.js";
import { ensureSchema, getSql } from "./db.js";

/** promisify 는 options 를 받는 형태를 잃어버리므로 직접 형을 적어 준다. */
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

export const ADMIN_ID = "director";
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;
const SESSION_HOURS = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 10;
export const MIN_PASSWORD_LENGTH = 10;
const COOKIE_NAME = "md_admin";

export type AdminAccount = {
  id: string;
  password_hash: string | null;
  password_salt: string | null;
  failed_attempts: number;
  locked_until: Date | null;
};

function signingSecret(): string {
  const secret = process.env.ADMIN_TOKEN ?? process.env.CRON_SECRET;
  if (!secret) throw new Error("ADMIN_TOKEN 환경변수가 설정되지 않았습니다.");
  return secret;
}

/** 같은 길이가 아니어도 안전하게 비교한다. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  const padded = Buffer.alloc(Math.max(left.length, right.length));
  const other = Buffer.alloc(padded.length);
  left.copy(padded);
  right.copy(other);
  return timingSafeEqual(padded, other) && left.length === right.length;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(32).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return { hash: derived.toString("hex"), salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== derived.length) return false;
  return timingSafeEqual(derived, stored);
}

export async function ensureAdminSchema(): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS admin_account (
      id TEXT PRIMARY KEY,
      password_hash TEXT,
      password_salt TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE admin_account ENABLE ROW LEVEL SECURITY`;
  await sql`REVOKE ALL ON TABLE admin_account FROM anon, authenticated`;
  await sql`
    INSERT INTO admin_account (id) VALUES (${ADMIN_ID})
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function loadAccount(): Promise<AdminAccount> {
  await ensureAdminSchema();
  const sql = getSql();
  const rows = await sql<AdminAccount[]>`
    SELECT id, password_hash, password_salt, failed_attempts, locked_until
    FROM admin_account WHERE id = ${ADMIN_ID}
  `;
  return rows[0];
}

export function isLocked(account: AdminAccount): boolean {
  return account.locked_until !== null && account.locked_until.getTime() > Date.now();
}

export async function recordFailure(account: AdminAccount): Promise<void> {
  const sql = getSql();
  const next = account.failed_attempts + 1;
  const lockUntil = next >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
  await sql`
    UPDATE admin_account
    SET failed_attempts = ${next}, locked_until = ${lockUntil}, updated_at = NOW()
    WHERE id = ${ADMIN_ID}
  `;
}

export async function recordSuccess(): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE admin_account
    SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
    WHERE id = ${ADMIN_ID}
  `;
}

export async function savePassword(password: string): Promise<void> {
  const { hash, salt } = await hashPassword(password);
  const sql = getSql();
  await sql`
    UPDATE admin_account
    SET password_hash = ${hash}, password_salt = ${salt},
        failed_attempts = 0, locked_until = NULL, updated_at = NOW()
    WHERE id = ${ADMIN_ID}
  `;
}

export function passwordProblem(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (password.length > 200) return "비밀번호가 너무 깁니다.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "비밀번호에 영문자와 숫자를 함께 넣어 주세요.";
  }
  return null;
}

/** 서명된 세션 값: <만료시각>.<서명> */
export function createSessionValue(): string {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const signature = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function isValidSessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  if (!safeEqual(signature, expected)) return false;
  const expiresAt = Number.parseInt(payload, 10);
  return Number.isSafeInteger(expiresAt) && expiresAt > Date.now();
}

export function readCookie(request: VercelRequest, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

export function hasAdminSession(request: VercelRequest): boolean {
  return isValidSessionValue(readCookie(request, COOKIE_NAME));
}

export function setSessionCookie(response: VercelResponse, value: string | null): void {
  const base = `${COOKIE_NAME}=${value ? encodeURIComponent(value) : ""}`;
  const attributes = [
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    value ? `Max-Age=${SESSION_HOURS * 60 * 60}` : "Max-Age=0",
  ];
  response.setHeader("Set-Cookie", `${base}; ${attributes.join("; ")}`);
}

/** 최초 비밀번호를 정할 때 한 번만 쓰는 설치 코드. */
export function isSetupCode(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const allowed = [process.env.ADMIN_TOKEN, process.env.CRON_SECRET].filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
  return allowed.some((entry) => safeEqual(value, entry));
}
