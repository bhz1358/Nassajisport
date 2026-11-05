import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { destroySession, getUsers, hashPassword, requireAdmin, saveUsers, verifyPassword } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { faDate } from "@/lib/format";

export const metadata: Metadata = { title: "مدیران" };

const BACK = "/admin/users/";
const MIN_PASSWORD = 10;

async function addUser(fd: FormData) {
  "use server";
  await requireAdmin();
  const username = str(fd, "username");
  const password = String(fd.get("password") ?? "");
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) redirect(withError(BACK, "نام کاربری: ۳ تا ۳۲ حرف انگلیسی، عدد، نقطه یا خط تیره."));
  if (password.length < MIN_PASSWORD) redirect(withError(BACK, `رمز عبور حداقل ${MIN_PASSWORD} نویسه باشد.`));
  const users = getUsers();
  if (users.some((u) => u.username === username)) redirect(withError(BACK, "این نام کاربری وجود دارد."));
  saveUsers([...users, { username, password: hashPassword(password), createdAt: new Date().toISOString() }]);
  redirect(`${BACK}?ok=created`);
}

async function changePassword(fd: FormData) {
  "use server";
  const me = await requireAdmin();
  const users = getUsers();
  const user = users.find((u) => u.username === me)!;
  if (!verifyPassword(String(fd.get("current") ?? ""), user.password)) redirect(withError(BACK, "رمز فعلی درست نیست."));
  const next = String(fd.get("next") ?? "");
  if (next.length < MIN_PASSWORD) redirect(withError(BACK, `رمز جدید حداقل ${MIN_PASSWORD} نویسه باشد.`));
  saveUsers(users.map((u) => (u.username === me ? { ...u, password: hashPassword(next) } : u)));
  redirect(`${BACK}?ok=password`);
}

async function removeUser(fd: FormData) {
  "use server";
  const me = await requireAdmin();
  const username = str(fd, "username");
  const users = getUsers();
  if (users.length <= 1) redirect(withError(BACK, "حداقل یک مدیر باید بماند."));
  saveUsers(users.filter((u) => u.username !== username));
  if (username === me) {
    await destroySession();
    redirect("/admin/login/");
  }
  redirect(`${BACK}?ok=deleted`);
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const users = getUsers();
  return (
    <>
      <PageHead title="مدیران" />
      <Flash searchParams={searchParams} />
      <div className="a-card a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>نام کاربری</th>
              <th>تاریخ ایجاد</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username}>
                <td className="a-strong" dir="ltr">
                  {u.username} {u.username === me && <span className="a-tag">شما</span>}
                </td>
                <td className="muted">{faDate(u.createdAt)}</td>
                <td>
                  <form action={removeUser}>
                    <input type="hidden" name="username" value={u.username} />
                    <SubmitButton className="a-btn a-btn-small a-btn-danger" confirm={`دسترسی «${u.username}» حذف شود؟`}>
                      حذف
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="a-grid-2">
        <form action={addUser} className="a-card">
          <h2>افزودن مدیر</h2>
          <Field label="نام کاربری" hint="انگلیسی">
            <input name="username" required dir="ltr" autoComplete="off" />
          </Field>
          <Field label="رمز عبور" hint={`حداقل ${MIN_PASSWORD} نویسه`}>
            <input name="password" type="password" required minLength={MIN_PASSWORD} dir="ltr" autoComplete="new-password" />
          </Field>
          <SubmitButton>افزودن</SubmitButton>
        </form>
        <form action={changePassword} className="a-card">
          <h2>تغییر رمز خودم</h2>
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
