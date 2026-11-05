import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "../actions";
import { Field, Flash } from "../ui";
import { SubmitButton } from "../ui-client";
import { currentUser, getUsers } from "@/lib/auth";
import { getSettings, logoUrl } from "@/lib/settings";

export const metadata: Metadata = { title: "ورود" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await currentUser()) redirect("/admin/");
  const firstRun = getUsers().length === 0;
  return (
    <div className="a-login">
      <form action={login} className="a-card a-login-card">
        <div className="a-login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl(getSettings())} alt="" className="logo-img" width={56} height={56} />
          <div>
            <strong>{getSettings().title}</strong>
            <span>پنل مدیریت</span>
          </div>
        </div>
        <Flash searchParams={searchParams} />
        {firstRun && (
          <p className="a-hint">
            اولین ورود: نام کاربری و رمزی را وارد کنید که در تنظیمات سرور (ADMIN_USERNAME و ADMIN_PASSWORD) تعیین شده.
          </p>
        )}
        <Field label="نام کاربری">
          <input name="username" autoComplete="username" required dir="ltr" autoFocus />
        </Field>
        <Field label="رمز عبور">
          <input name="password" type="password" autoComplete="current-password" required dir="ltr" />
        </Field>
        <SubmitButton>ورود</SubmitButton>
      </form>
    </div>
  );
}
