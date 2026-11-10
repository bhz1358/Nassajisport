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
import { clientIp } from "@/lib/client-ip";

export async function login(fd: FormData) {
  const h = await headers();
  const key = clientIp(h);
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
