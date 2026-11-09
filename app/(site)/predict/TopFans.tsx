import Link from "next/link";
import { SectionHeader } from "../components";
import { seasonTable } from "@/lib/predictions";
import { Podium } from "./ui";

/** Home page: the contest's first three of the season with their photos and cups. */
export function TopFans() {
  const rows = seasonTable();
  return (
    <section className="panel top-fans">
      <SectionHeader title="🏆 برترین‌های پیش‌بینی" href="/predict/table/" />
      {rows.length ? (
        <Podium rows={rows} />
      ) : (
        <p className="muted predict-empty">
          هنوز امتیازی ثبت نشده است. <Link href="/predict/">اولین نفر باشید!</Link>
        </p>
      )}
    </section>
  );
}
