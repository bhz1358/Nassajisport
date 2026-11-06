import type { Metadata } from "next";
import { AdSlot } from "../ad-slot";
import { SectionHeader, StoryRow } from "../components";
import { getNews } from "@/lib/content";
import { faNum } from "@/lib/format";

export const metadata: Metadata = { title: "جست‌وجو" };

// Arabic and Persian forms of the same letters should match each other.
const norm = (s: string) =>
  s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ْ‌]/g, "")
    .toLowerCase();

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const results = terms.length
    ? getNews()
        .map((p) => {
          const title = norm(p.title);
          const body = norm(`${p.excerpt} ${p.tags.join(" ")}`);
          if (!terms.every((t) => title.includes(t) || body.includes(t))) return null;
          return { p, score: terms.filter((t) => title.includes(t)).length };
        })
        .filter((x) => x !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
    : [];

  return (
    <section className="search-page">
      <AdSlot slot={1} className="ad-top" />
      <h1 className="page-title">جست‌وجو</h1>
      <form role="search" className="search-form">
        <input name="q" defaultValue={q} placeholder="نام بازیکن، تیم یا موضوع خبر…" aria-label="عبارت جست‌وجو" autoFocus />
        <button className="btn btn-primary">جست‌وجو</button>
      </form>
      {q && (
        <>
          <SectionHeader title={results.length ? `${faNum(results.length)} نتیجه برای «${q}»` : `نتیجه‌ای برای «${q}» پیدا نشد`} />
          <div className="rows rows-1">
            {results.map(({ p }) => (
              <StoryRow key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
