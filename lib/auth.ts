import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DATA_DIR, readStore, writeStore } from "./store";
import { can, roleOf, type Role, type Section } from "./roles";
import type { AdminUser } from "./types";

const COOKIE = "ns_admin";
const SESSION_DAYS = 14;

/** SESSION_SECRET from the environment, otherwise a random key generated once and kept in DATA_DIR. */
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = path.join(DATA_DIR, ".session-secret");
  try {
    return fs.readFileSync(f, "utf8").trim();
  } catch {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const s = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(f, s, { mode: 0o600 });
    return s;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  return `${salt.toString("hex")}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, Buffer.from(salt, "hex"), 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function getUsers(): AdminUser[] {
  return readStore<AdminUser[]>("users", () => []);
}

export function saveUsers(users: AdminUser[]) {
  writeStore("users", users);
}

/**
 * Checks credentials. While no admin user exists yet, the first login must match
 * ADMIN_USERNAME / ADMIN_PASSWORD from the environment and creates that user.
 */
export function checkLogin(username: string, password: string): { ok: true } | { ok: false; reason: string } {
  const users = getUsers();
  if (users.length === 0) {
    const envUser = process.env.ADMIN_USERNAME || "admin";
    const envPass = process.env.ADMIN_PASSWORD;
    if (!envPass) return { ok: false, reason: "هنوز مدیری تعریف نشده. ADMIN_PASSWORD را در تنظیمات سرور تعیین کنید." };
    const same = (a: string, b: string) =>
      crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(), crypto.createHash("sha256").update(b).digest());
    if (!same(username, envUser) || !same(password, envPass)) return { ok: false, reason: "نام کاربری یا رمز عبور درست نیست." };
    saveUsers([{ username, role: "admin", password: hashPassword(password), createdAt: new Date().toISOString() }]);
    return { ok: true };
  }
  const user = users.find((u) => u.username === username);
  // Hash anyway so timing does not reveal whether the username exists.
  const ok = verifyPassword(password, user?.password ?? hashPassword("x"));
  return user && ok ? { ok: true } : { ok: false, reason: "نام کاربری یا رمز عبور درست نیست." };
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** A value signed with the site's secret: `data.signature` (for cookies other code sets). */
export const signValue = (data: object) => {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

/** The data of a value made by signValue, or null if it was tampered with. */
export function readSigned<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/** Cookies are Secure in production unless the site still runs on plain HTTP (INSECURE_COOKIES=1). */
export const secureCookies = () => process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";

export async function createSession(username: string) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof u !== "string" || Date.now() > exp) return null;
    // A deleted user's cookie stops working immediately.
    if (!getUsers().some((x) => x.username === u)) return null;
    return u;
  } catch {
    return null;
  }
}

export type PanelUser = { username: string; name: string; role: Role };

/** The signed-in panel user with their access level, or null. */
export async function getPanelUser(): Promise<PanelUser | null> {
  const u = await currentUser();
  if (!u) return null;
  const user = getUsers().find((x) => x.username === u);
  return { username: u, name: user?.name || u, role: roleOf(user) };
}

/**
 * Use at the top of every admin page and server action. With a section, users
 * whose role does not include it are sent back to the dashboard.
 */
export async function requireAccess(section?: Section): Promise<PanelUser> {
  const user = await getPanelUser();
  if (!user) redirect("/admin/login/");
  if (section && !can(user.role, section)) redirect(`/admin/?error=${encodeURIComponent("به این بخش دسترسی ندارید.")}`);
  return user;
}

/** Any signed-in panel user; returns the username. */
export async function requireAdmin(): Promise<string> {
  return (await requireAccess()).username;
}

// Simple in-memory brake on password guessing: 8 failures per 15 minutes per key.
const attempts = new Map<string, { n: number; until: number }>();
export function loginBlocked(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.n >= 8 && Date.now() < a.until;
}
export function recordLoginFailure(key: string) {
  const a = attempts.get(key);
  const fresh = !a || Date.now() > a.until;
  attempts.set(key, { n: fresh ? 1 : a.n + 1, until: Date.now() + 15 * 60_000 });
}
export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
