import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { createSession, destroySession, getUsers, hashPassword, requireAccess, saveUsers } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { faDate } from "@/lib/format";
import { isRole, roleInfo, roleOf, ROLES } from "@/lib/roles";
import type { AdminUser } from "@/lib/types";

export const metadata: Metadata = { title: "کاربران" };

const BACK = "/admin/users/";
const MIN_PASSWORD = 10;

const admins = (users: AdminUser[]) => users.filter((u) => roleOf(u) === "admin").length;

async function addUser(fd: FormData) {
  "use server";
  await requireAccess("users");
  const username = str(fd, "username");
  const name = str(fd, "name").slice(0, 60);
  const role = str(fd, "role");
  const password = String(fd.get("password") ?? "");
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) redirect(withError(BACK, "نام کاربری: ۳ تا ۳۲ حرف انگلیسی، عدد، نقطه یا خط تیره."));
  if (!isRole(role)) redirect(withError(BACK, "سطح دسترسی را انتخاب کنید."));
  if (password.length < MIN_PASSWORD) redirect(withError(BACK, `رمز عبور حداقل ${MIN_PASSWORD} نویسه باشد.`));
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) redirect(withError(BACK, "این نام کاربری وجود دارد."));
  saveUsers([...users, { username, name: name || undefined, role, password: hashPassword(password), createdAt: new Date().toISOString() }]);
  redirect(`${BACK}?ok=created`);
}

async function updateUser(fd: FormData) {
  "use server";
  const me = await requireAccess("users");
  const username = str(fd, "username");
  const role = str(fd, "role");
  const name = str(fd, "name").slice(0, 60);
  const password = String(fd.get("password") ?? "");
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) redirect(withError(BACK, "این کاربر پیدا نشد."));
  if (!isRole(role)) redirect(withError(BACK, "سطح دسترسی را انتخاب کنید."));
  if (roleOf(user) === "admin" && role !== "admin" && admins(users) <= 1) {
    redirect(withError(BACK, "حداقل یک «مدیر کل» باید بماند؛ اول کاربر دیگری را مدیر کل کنید."));
  }
  if (password && password.length < MIN_PASSWORD) redirect(withError(BACK, `رمز جدید حداقل ${MIN_PASSWORD} نویسه باشد.`));
  saveUsers(
    users.map((u) => (u.username === username ? { ...u, role, name: name || undefined, ...(password ? { password: hashPassword(password) } : {}) } : u)),
  );
  // A new password ends the user's sessions; keep your own one.
  if (password && username === me.username) await createSession(me.username);
  // Taking away your own admin access sends you to the dashboard.
  redirect(username === me.username && role !== "admin" ? "/admin/?ok=saved" : `${BACK}?ok=saved`);
}

async function removeUser(fd: FormData) {
  "use server";
  const me = await requireAccess("users");
  const username = str(fd, "username");
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) redirect(withError(BACK, "این کاربر پیدا نشد."));
  if (roleOf(user) === "admin" && admins(users) <= 1) redirect(withError(BACK, "حداقل یک «مدیر کل» باید بماند."));
  saveUsers(users.filter((u) => u.username !== username));
  if (username === me.username) {
    await destroySession();
    redirect("/admin/login/");
  }
  redirect(`${BACK}?ok=deleted`);
}

function RoleSelect({ value }: { value?: string }) {
  return (
    <select name="role" defaultValue={value ?? "writer"} required>
      {ROLES.map((r) => (
        <option key={r.id} value={r.id}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAccess("users");
  const users = getUsers();
  return (
    <>
      <PageHead title="کاربران" />
      <Flash searchParams={searchParams} />

      <div className="a-card a-roles">
        <h2>سطح‌های دسترسی</h2>
        <dl>
          {ROLES.map((r) => (
            <div key={r.id}>
              <dt>{r.label}</dt>
              <dd>{r.description}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="a-card">
        <h2>کاربران پنل</h2>
        {users.map((u) => {
          const role = roleOf(u);
          return (
            <details key={u.username} className="a-ad-item a-user" id={`u-${u.username}`}>
              <summary>
                <span className="a-strong">{u.name || u.username}</span>
                <span className="muted small" dir="ltr">
                  {u.username}
                </span>
                <span className={`a-tag ${role === "admin" ? "is-accent" : ""}`}>{roleInfo(role).label}</span>
                {u.username === me.username && <span className="a-tag is-ok">شما</span>}
                <span className="muted small">از {faDate(u.createdAt)}</span>
              </summary>
              <form action={updateUser} className="a-ad-form">
                <input type="hidden" name="username" value={u.username} />
                <div className="a-grid-fields">
                  <Field label="نام نمایشی" hint="مثلاً نام خبرنگار؛ به‌عنوان نویسنده‌ی خبرهای او ثبت می‌شود">
                    <input name="name" defaultValue={u.name} />
                  </Field>
                  <Field label="سطح دسترسی">
                    <RoleSelect value={role} />
                  </Field>
                  <Field label="رمز جدید" hint="فقط برای تغییر رمز؛ خالی بماند، رمز عوض نمی‌شود">
                    <input name="password" type="password" minLength={MIN_PASSWORD} dir="ltr" autoComplete="new-password" />
                  </Field>
                </div>
                <div className="a-ad-actions">
                  <SubmitButton>ذخیره</SubmitButton>
                </div>
              </form>
              <form action={removeUser} className="a-danger-zone">
                <input type="hidden" name="username" value={u.username} />
                <SubmitButton className="a-btn a-btn-small a-btn-danger" confirm={`کاربر «${u.name || u.username}» حذف شود؟ دیگر نمی‌تواند وارد پنل شود.`} pendingText="در حال حذف…">
                  حذف کاربر
                </SubmitButton>
              </form>
            </details>
          );
        })}
      </section>

      <form action={addUser} className="a-card a-form-narrow">
        <h2>افزودن کاربر</h2>
        <Field label="نام کاربری" hint="انگلیسی؛ برای ورود به پنل">
          <input name="username" required dir="ltr" autoComplete="off" pattern="[a-zA-Z0-9_.\-]{3,32}" />
        </Field>
        <Field label="نام نمایشی" hint="اختیاری، مثلاً «علی رضایی»">
          <input name="name" />
        </Field>
        <Field label="سطح دسترسی">
          <RoleSelect />
        </Field>
        <Field label="رمز عبور" hint={`حداقل ${MIN_PASSWORD} نویسه؛ آن را جداگانه و امن به کاربر بدهید`}>
          <input name="password" type="password" required minLength={MIN_PASSWORD} dir="ltr" autoComplete="new-password" />
        </Field>
        <SubmitButton>افزودن کاربر</SubmitButton>
      </form>
    </>
  );
}
