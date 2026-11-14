"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkLogin,
  clearLoginFailures,
  createSession,
  destroySession,
  loginBlocked,
  recordLoginFailure,
} from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { clientIp } from "@/lib/client-ip";
import { CAPTCHA_COOKIE, checkCaptcha } from "@/lib/captcha";
import { faNum } from "@/lib/format";
import { accountLocked, recordFailure, recordSuccess } from "@/lib/login-guard";

export async function login(fd: FormData) {
  const h = await headers();
  const key = clientIp(h);
  const ua = (h.get("user-agent") ?? "").slice(0, 120);
  const back = (msg: string) => redirect(withError("/admin/login/", msg));
  if (loginBlocked(key)) back("تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه بعد دوباره امتحان کنید.");

  const username = str(fd, "username");
  // The captcha first: a wrong one never reaches the password check.
  const jar = await cookies();
  const captchaOk = checkCaptcha(jar.get(CAPTCHA_COOKIE)?.value, str(fd, "captcha"));
  jar.delete({ name: CAPTCHA_COOKIE, path: "/admin/" });
  if (!captchaOk) {
    recordLoginFailure(key);
    await recordFailure(username, key, "کد امنیتی اشتباه", ua, false);
    back("کد امنیتی درست نیست یا منقضی شده؛ کد تازه را وارد کنید.");
  }
  const locked = accountLocked(username);
  if (locked) {
    recordLoginFailure(key);
    await recordFailure(username, key, "تلاش روی حساب قفل‌شده", ua, false);
    back(`این حساب به‌خاطر رمزهای اشتباه پشت‌سرهم قفل شده؛ ${faNum(locked)} دقیقهٔ دیگر امتحان کنید.`);
  }
  const result = checkLogin(username, String(fd.get("password") ?? ""));
  if (!result.ok) {
    recordLoginFailure(key);
    await recordFailure(username, key, "رمز یا نام کاربری اشتباه", ua);
    back(result.reason);
  }
  clearLoginFailures(key);
  await recordSuccess(username, key, ua);
  await createSession(username);
  redirect("/admin/");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login/");
}
