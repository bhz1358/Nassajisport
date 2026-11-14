import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { createSession, getUsers, hashPassword, requireAccess, saveUsers, verifyPassword } from "@/lib/auth";
import { faDate } from "@/lib/format";
import { loginLog } from "@/lib/login-guard";
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
  if (next === String(fd.get("current") ?? "")) redirect(withError(BACK, "رمز جدید باید با رمز فعلی فرق داشته باشد."));
  saveUsers(users.map((u) => (u.username === me.username ? { ...u, password: hashPassword(next) } : u)));
  // Other devices are signed out by the new password; this one stays in.
  await createSession(me.username);
  redirect(`${BACK}?ok=password`);
}

async function signOutEverywhere() {
  "use server";
  const me = await requireAccess();
  saveUsers(getUsers().map((u) => (u.username === me.username ? { ...u, sv: (u.sv ?? 0) + 1 } : u)));
  await createSession(me.username);
  redirect(`${BACK}?ok=${encodeURIComponent("از همهٔ دستگاه‌های دیگر خارج شدید.")}`);
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAccess();
  const role = roleInfo(me.role);
  const log = loginLog().filter((e) => me.role === "admin" || e.user.toLowerCase() === me.username.toLowerCase());
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
          <p className="a-hint">با تغییر رمز، همهٔ دستگاه‌های دیگر از پنل خارج می‌شوند.</p>
          <SubmitButton>تغییر رمز</SubmitButton>
        </form>
      </div>
      <section className="a-card">
        <h2>امنیت ورود</h2>
        <p className="a-hint">
          ورود به پنل کد امنیتی (کپچا) می‌خواهد؛ هر حساب بعد از ۶ رمز اشتباه ۱۵ دقیقه قفل می‌شود؛ ورود از نشانی تازه و قفل شدن حساب در بله به گفت‌وگوی پشتیبان خبر داده می‌شود.
        </p>
        <form action={signOutEverywhere}>
          <SubmitButton className="a-btn">خروج از همهٔ دستگاه‌های دیگر</SubmitButton>
        </form>
        <h3>ورودهای اخیر{me.role === "admin" ? " (همهٔ کاربران)" : ""}</h3>
        <div className="a-table-wrap">
          <table className="a-table a-login-log">
            <thead>
              <tr><th>زمان</th><th>کاربر</th><th>نشانی</th><th>نتیجه</th></tr>
            </thead>
            <tbody>
              {log.slice(0, 30).map((e, i) => (
                <tr key={i}>
                  <td>{faDate(e.at)}</td>
                  <td dir="ltr">{e.user || "—"}</td>
                  <td dir="ltr">{e.ip}</td>
                  <td>{e.ok ? <span className="a-tag is-ok">ورود موفق</span> : <span className="a-tag">{e.why ?? "ناموفق"}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
