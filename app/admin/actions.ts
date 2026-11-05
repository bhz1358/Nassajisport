"use server";

import { headers } from "next/headers";
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

export async function login(fd: FormData) {
  const h = await headers();
  const key = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
  if (loginBlocked(key)) redirect(withError("/admin/login/", "تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه بعد دوباره امتحان کنید."));

  const username = str(fd, "username");
  const result = checkLogin(username, String(fd.get("password") ?? ""));
  if (!result.ok) {
    recordLoginFailure(key);
    redirect(withError("/admin/login/", result.reason));
  }
  clearLoginFailures(key);
  await createSession(username);
  redirect("/admin/");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login/");
}
