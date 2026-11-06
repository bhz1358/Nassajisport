import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { getUsers, hashPassword, requireAccess, saveUsers, verifyPassword } from "@/lib/auth";
import { withError } from "@/lib/form";
import { roleInfo } from "@/lib/roles";

export const metadata: Metadata = { title: "حساب من" };

const BACK = "/admin/account/";
const MIN_PASSWORD = 10;

async function changePassword(fd: FormData) {
  "use server";
  const me = await requireAccess();
  const users = getUsers();
  const user = users.find((u) => u.username === me.username)!;
  if (!verifyPassword(String(fd.get("current") ?? ""), user.password)) redirect(withError(BACK, "رمز فعلی درست نیست."));
  const next = String(fd.get("next") ?? "");
  if (next.length < MIN_PASSWORD) redirect(withError(BACK, `رمز جدید حداقل ${MIN_PASSWORD} نویسه باشد.`));
  saveUsers(users.map((u) => (u.username === me.username ? { ...u, password: hashPassword(next) } : u)));
  redirect(`${BACK}?ok=password`);
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAccess();
  const role = roleInfo(me.role);
  return (
    <>
      <PageHead title="حساب من" />
      <Flash searchParams={searchParams} />
      <div className="a-grid-2">
        <div className="a-card">
          <h2>{me.name}</h2>
          <p className="muted" dir="ltr" style={{ textAlign: "right" }}>
            {me.username}
          </p>
          <p>
            سطح دسترسی: <span className="a-tag is-accent">{role.label}</span>
          </p>
          <p className="a-hint">{role.description}</p>
        </div>
        <form action={changePassword} className="a-card">
          <h2>تغییر رمز</h2>
          <Field label="رمز فعلی">
            <input name="current" type="password" required dir="ltr" autoComplete="current-password" />
          </Field>
          <Field label="رمز جدید" hint={`حداقل ${MIN_PASSWORD} نویسه`}>
            <input name="next" type="password" required minLength={MIN_PASSWORD} dir="ltr" autoComplete="new-password" />
          </Field>
          <SubmitButton>تغییر رمز</SubmitButton>
        </form>
      </div>
    </>
  );
}
