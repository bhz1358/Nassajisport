import { toLatinDigits } from "./jalali.ts";
import { HOME_TEAM } from "./site.ts";
import type { StandingRow } from "./types";

// Reads a league table copied from a sports site (e.g. Varzesh3) — either the page's
// HTML or text copied from the browser — into standings rows.

type Col = "played" | "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst" | "diff" | "points";

const HEADER_WORDS: [RegExp, Col][] = [
  [/^(بازی|ب|مسابقه|بازی‌ها)$/, "played"],
  [/^(برد|بُرد|پیروزی|ب‌ر)$/, "won"],
  [/^(مساوی|تساوی|م)$/, "drawn"],
  [/^(باخت|شکست|ش)$/, "lost"],
  [/^(زده|گل زده|گ‌ز|ز)$/, "goalsFor"],
  [/^(خورده|گل خورده|گ‌خ|خ)$/, "goalsAgainst"],
  [/^(تفاضل|تفاضل گل|\+\/-|ت)$/, "diff"],
  [/^(امتیاز|امتیازات|امت)$/, "points"],
];

// Column orders seen on Persian sports sites, tried when there is no header to go by.
const LAYOUTS: Col[][] = [
  ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "diff", "points"],
  ["played", "won", "drawn", "lost", "diff", "points"],
  ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "points"],
  ["played", "won", "drawn", "lost", "points"],
  ["points", "diff", "goalsAgainst", "goalsFor", "lost", "drawn", "won", "played"],
  ["points", "diff", "lost", "drawn", "won", "played"],
];

const norm = (s: string) =>
  toLatinDigits(s)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‏‎]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NUM = /^[+\-−]?\d+$/;
const toNum = (s: string) => Number(s.replace("−", "-"));

/** Teams are written differently on each site; keep the club's own name exact so its row is highlighted. */
function teamName(raw: string): string {
  const name = norm(raw).replace(/^\d+\s*/, "").trim();
  return name.includes("نساجی") ? HOME_TEAM : name;
}

/** HTML table → rows of cell text. */
function htmlToRows(html: string): string[][] {
  const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  const strip = (s: string) =>
    norm(
      s
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&"),
    );
  for (const t of tables) {
    const rows = [...t.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((r) =>
      [...r[0].matchAll(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi)].map((c) => strip(c[0])),
    );
    // The standings table is the one whose header mentions points.
    if (rows.some((r) => r.some((c) => /امتیاز/.test(c)))) return rows;
  }
  return [];
}

/** Copied text → rows of cells (tabs when copied from a table, otherwise runs of spaces). */
function textToRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => norm(line.replace(/\t/g, " \t ")))
    .filter(Boolean)
    .map((line) => (line.includes("\t") ? line.split("\t").map((c) => c.trim()).filter(Boolean) : line.split(" ")));
}

function consistent(r: Partial<Record<Col, number>>): boolean {
  const { played, won, drawn, lost, goalsFor, goalsAgainst, diff, points } = r;
  if (won === undefined || drawn === undefined || lost === undefined) return false;
  if (played !== undefined && played !== won + drawn + lost) return false;
  if (points !== undefined && points !== won * 3 + drawn) return false;
  if (diff !== undefined && goalsFor !== undefined && goalsAgainst !== undefined && diff !== goalsFor - goalsAgainst) return false;
  return true;
}

export type ParseResult = { rows: StandingRow[]; warnings: string[] };

export function parseStandings(input: string): ParseResult {
  const isHtml = /<table\b/i.test(input);
  const raw = isHtml ? htmlToRows(input) : textToRows(input);
  const warnings: string[] = [];

  // Header row, if present, tells us the column order for certain.
  let headerCols: Col[] | undefined;
  for (const r of raw) {
    const cols = r.map((c) => HEADER_WORDS.find(([re]) => re.test(c))?.[1]).filter((c): c is Col => !!c);
    if (cols.length >= 4 && cols.includes("points")) {
      headerCols = cols;
      break;
    }
  }

  const out: StandingRow[] = [];
  for (const cells of raw) {
    // A team row: some words (the name) and enough numbers.
    const words = cells.filter((c) => !NUM.test(c) && /\p{L}/u.test(c));
    let nums = cells.filter((c) => NUM.test(c)).map(toNum);
    if (words.length === 0 || nums.length < 5) continue;
    const name = teamName(words.join(" "));
    if (!name || /امتیاز|تیم/.test(name)) continue;

    // Drop a leading rank number when there is one more number than columns.
    const layouts = headerCols ? [headerCols] : LAYOUTS;
    let picked: Partial<Record<Col, number>> | undefined;
    for (const layout of layouts) {
      for (const candidate of [nums, nums.slice(1), nums.slice(0, -1)]) {
        if (candidate.length !== layout.length) continue;
        const r = Object.fromEntries(layout.map((c, i) => [c, candidate[i]])) as Partial<Record<Col, number>>;
        if (consistent(r)) {
          picked = r;
          break;
        }
      }
      if (picked) break;
    }
    if (!picked) {
      warnings.push(`ردیف «${name}» خوانده نشد (اعداد: ${nums.join(" ")}).`);
      continue;
    }
    const { won = 0, drawn = 0, lost = 0 } = picked;
    out.push({
      team: name,
      played: won + drawn + lost,
      won,
      drawn,
      lost,
      goalsFor: picked.goalsFor ?? 0,
      goalsAgainst: picked.goalsAgainst ?? (picked.goalsFor !== undefined && picked.diff !== undefined ? picked.goalsFor - picked.diff : 0),
      points: won * 3 + drawn,
    });
    nums = [];
  }
  return { rows: out, warnings };
}
