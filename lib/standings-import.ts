import { toLatinDigits } from "./jalali.ts";
import { HOME_TEAM } from "./site.ts";
import { formFromLetters, isFormLetter, splitNameAndForm } from "./team-names.ts";
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
/** "19-5": goals scored and conceded in one cell. */
const GOAL_PAIR = /^(\d+)\s*[-–:]\s*(\d+)$/;
/** Form guide: W/D/L (or Persian ب/م/ش), e.g. "WDWLW". */
const FORM = /^[WDLبمش]{2,10}$/i;
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

const isNumberish = (t: string) => NUM.test(t) || GOAL_PAIR.test(t);

/**
 * Copied text → rows of cells. Handles one team per line, and the layout a browser
 * produces when copying a styled table, where the rank, the team name and the numbers
 * land on separate lines.
 */
function textToRows(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => norm(line.replace(/\t/g, " \t ")))
    .filter(Boolean)
    .map((line) => (line.includes("\t") ? line.split("\t").map((c) => c.trim()).filter(Boolean) : line.split(" ")));
  const rows: string[][] = [];
  let pendingName: string[] = [];
  for (const cells of lines) {
    const numeric = cells.filter(isNumberish).length;
    // Single W/D/L letters are the form guide split into cells, not words of a name.
    const hasWords = cells.some((c) => !isNumberish(c) && !FORM.test(c) && !isFormLetter(c) && /\p{L}/u.test(c));
    if (hasWords && numeric < 2) {
      // A name on its own line (or a header): the numbers follow on the next line.
      pendingName = cells;
      if (cells.some((c) => /امتیاز/.test(c))) {
        rows.push(cells);
        pendingName = [];
      }
    } else if (!hasWords && numeric >= 4 && pendingName.length) {
      rows.push([...pendingName, ...cells]);
      pendingName = [];
    } else if (hasWords) {
      rows.push(cells);
      pendingName = [];
    }
    // Lines holding only a rank number are skipped.
  }
  return rows;
}

/** Most points a row can legally lose to a deduction before we treat the numbers as misread. */
const MAX_DEDUCTION = 15;

function consistent(r: Partial<Record<Col, number>>, allowDeduction = false): boolean {
  const { played, won, drawn, lost, goalsFor, goalsAgainst, diff, points } = r;
  if (won === undefined || drawn === undefined || lost === undefined) return false;
  if (played !== undefined && played !== won + drawn + lost) return false;
  if (diff !== undefined && goalsFor !== undefined && goalsAgainst !== undefined && diff !== goalsFor - goalsAgainst) return false;
  if (points !== undefined) {
    const gap = won * 3 + drawn - points;
    if (gap !== 0 && !(allowDeduction && gap > 0 && gap <= MAX_DEDUCTION)) return false;
  }
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
    if ((cols.length >= 4 || (cols.length >= 2 && cols.includes("played"))) && cols.includes("points")) {
      headerCols = cols;
      break;
    }
  }

  const out: StandingRow[] = [];
  for (const cells of raw) {
    // A team row: some words (the name) and enough numbers.
    const formCell = cells.find((c) => FORM.test(c.replace(/\s+/g, "")));
    const letters = cells.filter(isFormLetter).join("");
    const words = cells.filter((c) => !isNumberish(c) && c !== formCell && !isFormLetter(c) && /\p{L}/u.test(c));
    let nums = cells.filter(isNumberish).flatMap((c) => {
      const pair = c.match(GOAL_PAIR);
      return pair ? [Number(pair[1]), Number(pair[2])] : [toNum(c)];
    });
    const split = splitNameAndForm(words.join(" "));
    const form = formCell ? formFromLetters(formCell) : letters.length >= 2 ? formFromLetters(letters) : split.form;
    if (words.length === 0 || nums.length < 2) continue;
    const name = teamName(split.name);
    if (!name || /امتیاز|تیم/.test(name)) continue;

    // Drop a leading rank number when there is one more number than columns.
    // The header's order first; it can miss a combined "goals" column, so the known layouts follow.
    const layouts = headerCols ? [headerCols, ...LAYOUTS] : LAYOUTS;
    let picked: Partial<Record<Col, number>> | undefined;
    // First an exact fit; then allow a points deduction, but only where played and goal difference still check out.
    for (const allowDeduction of [false, true]) {
      for (const layout of layouts) {
        if (allowDeduction && !(layout.includes("played") && layout.includes("diff") && layout.includes("points"))) continue;
        for (const candidate of [nums, nums.slice(1), nums.slice(0, -1)]) {
          if (candidate.length !== layout.length) continue;
          const r = Object.fromEntries(layout.map((c, i) => [c, candidate[i]])) as Partial<Record<Col, number>>;
          if (consistent(r, allowDeduction)) {
            picked = r;
            break;
          }
        }
        if (picked) break;
      }
      if (picked) break;
    }
    // Short tables (rank, team, played, points) give no W/D/L: keep what is known.
    if (!picked && (!headerCols || !headerCols.includes("won"))) {
      for (const candidate of [nums, nums.slice(1)]) {
        const order = headerCols?.filter((c) => c === "played" || c === "points") ?? ["played", "points"];
        if (candidate.length !== 2 || order.length !== 2) continue;
        const r = Object.fromEntries(order.map((c, i) => [c, candidate[i]])) as Partial<Record<Col, number>>;
        if (r.played! >= 0 && r.points! >= 0 && r.points! <= r.played! * 3) {
          out.push({ team: name, played: r.played!, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: r.points!, partial: true });
          picked = r;
        }
        break;
      }
      if (picked) continue;
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
      points: picked.points ?? won * 3 + drawn,
      ...(picked.points !== undefined && picked.points < won * 3 + drawn ? { deducted: won * 3 + drawn - picked.points } : {}),
      ...(form && form.length ? { form } : {}),
    });
    nums = [];
  }
  return { rows: out, warnings };
}
