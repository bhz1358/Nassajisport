import type { Metadata } from "next";
import Link from "next/link";
import { Flash, PageHead } from "../../ui";
import { requireAccess } from "@/lib/auth";
import { faDate } from "@/lib/format";
import { getReports } from "@/lib/match-reports";

export const metadata: Metadata = { title: "گزارش بازی‌ها" };

export default async function ReportsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("squad");
  const reports = [...getReports()].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHead title="گزارش بازی‌ها">
        <Link href="/admin/match-reports/new/" className="a-btn a-btn-primary">گزارش تازه</Link>
      </PageHead>
      <Flash searchParams={searchParams} />
      <div className="a-card">
        <p className="a-hint">
          ترکیب دو تیم، ذخیره‌ها، کادر فنی و داوران هر بازی (از برگهٔ رسمی گزارش مسابقه). در سایت: <a href="/match-reports/" target="_blank">/match-reports/</a> — برای منوی سایت از بخش «منوها»
          پیوندی به همین آدرس بسازید. ترکیب نساجی در هر گزارش، فهرست «نمرهٔ هواداران» همان بازی هم می‌شود.
        </p>
        {reports.length ? (
          <table className="a-table">
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.round ? `هفتهٔ ${r.round}` : ""}</td>
                  <td>
                    <Link href={`/admin/match-reports/${encodeURIComponent(r.id)}/`}>{r.home.team} - {r.away.team}</Link>
                  </td>
                  <td>{faDate(r.date)}</td>
                  <td><a href={`/match-reports/${encodeURIComponent(r.id)}/`} target="_blank">نمایش در سایت</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="a-hint">هنوز گزارشی ثبت نشده است.</p>
        )}
      </div>
    </>
  );
}
