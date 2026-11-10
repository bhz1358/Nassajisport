import Link from "next/link";
import { logout } from "../actions";
import { AdminNav } from "./nav";
import { pendingCount } from "@/lib/comments";
import { requireAccess } from "@/lib/auth";
import { roleInfo } from "@/lib/roles";
import { getSettings, logoUrl } from "@/lib/settings";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAccess();
  const settings = getSettings();
  const { title } = settings;
  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link href="/admin/" className="a-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl(settings)} alt="" className="logo-img" width={40} height={40} />
          <span>
            <strong>{title}</strong>
            <small>پنل مدیریت</small>
          </span>
        </Link>
        <AdminNav role={user.role} pendingComments={pendingCount()} />
        <div className="a-side-foot">
          <Link href="/" target="_blank" className="a-btn a-btn-small">
            مشاهده سایت ↗
          </Link>
          <form action={logout}>
            <span className="muted" title={roleInfo(user.role).label}>
              {user.name} · {roleInfo(user.role).label}
            </span>
            <button className="a-link">خروج</button>
          </form>
        </div>
      </aside>
      <main className="a-main">{children}</main>
    </div>
  );
}
