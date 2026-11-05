import Link from "next/link";
import { logout } from "../actions";
import { AdminNav } from "./nav";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const { title } = getSettings();
  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link href="/admin/" className="a-brand">
          <span className="logo-mark">{title.charAt(0)}</span>
          <span>
            <strong>{title}</strong>
            <small>پنل مدیریت</small>
          </span>
        </Link>
        <AdminNav />
        <div className="a-side-foot">
          <Link href="/" target="_blank" className="a-btn a-btn-small">
            مشاهده سایت ↗
          </Link>
          <form action={logout}>
            <span className="muted">{user}</span>
            <button className="a-link">خروج</button>
          </form>
        </div>
      </aside>
      <main className="a-main">{children}</main>
    </div>
  );
}
