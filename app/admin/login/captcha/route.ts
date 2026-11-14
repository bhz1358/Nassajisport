import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CAPTCHA_COOKIE, newCaptcha } from "@/lib/captcha";
import { secureCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** A fresh captcha image; its check goes in a short-lived cookie. */
export async function GET() {
  const { png, cookie } = await newCaptcha();
  (await cookies()).set(CAPTCHA_COOKIE, cookie, { httpOnly: true, sameSite: "strict", secure: secureCookies(), path: "/admin/", maxAge: 300 });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0" } });
}
