// SEO for news posts, worked out from the post itself so the admin doesn't have to:
// title, description, tags (teams and players named in the text), featured image,
// image alt text and the news structured data.

const DESCRIPTION_MAX = 158;
const TITLE_MAX = 65;

export const plainText = (html: string) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|figcaption)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s*\.\s*\.(\s*\.)*/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^\s*\.\s*/, "")
    .trim();

/** Cuts at a word boundary and adds "…" when something was cut. */
export function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s،,.:;!؟?-]+$/, "")}…`;
}

export const autoExcerpt = (content: string, max = 220) => clip(plainText(content), max);

/** What search engines show: the admin's own text when given, otherwise from the post. */
export function seoFor(post: { title: string; excerpt?: string; content: string; seo?: { title?: string; description?: string } }) {
  const title = post.seo?.title?.trim() || clip(post.title, TITLE_MAX);
  const description = post.seo?.description?.trim() || clip(post.excerpt?.trim() || plainText(post.content), DESCRIPTION_MAX);
  return { title, description };
}

const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌‏‎]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Teams and players named in the title or text, as tags (so the post also shows on
 * the player's page). A team counts by its full name or its first word when that is
 * distinctive ("پرسپولیس", "نساجی"); short or shared first words don't count alone.
 */
export function findTags(text: string, teamList: string[], playerList: string[]): string[] {
  // The same name twice in a list must not look like two clubs sharing a first word.
  const teams = [...new Set(teamList)];
  const players = [...new Set(playerList)];
  let t = ` ${norm(text)} `;
  const pattern = (name: string) => new RegExp(`(^|[\\s«»"'()،,.:؛!؟?-])${norm(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s«»"'()،,.:؛!؟?-]|ی\\b|ها)`, "gu");
  const has = (name: string) => norm(name).length >= 3 && pattern(name).test(t);
  // Longest names first, each removed from the text once found, so "استقلال خوزستان"
  // doesn't also count as "استقلال".
  const take = (name: string) => {
    if (!has(name)) return false;
    t = t.replace(pattern(name), "$1 ");
    return true;
  };
  const firstWords = teams.map((x) => norm(x).split(" ")[0]);
  const found = new Set<string>();
  for (const team of [...teams].sort((a, b) => b.length - a.length)) {
    const first = norm(team).split(" ")[0];
    // A first word shared by two clubs ("استقلال") only counts as the club named just that.
    const shared = firstWords.filter((w) => w === first).length > 1;
    if (take(team) || (!shared && first.length >= 4 && first !== norm(team) && take(first))) found.add(team);
  }
  for (const p of [...players].sort((a, b) => b.length - a.length)) if (norm(p).includes(" ") && take(p)) found.add(p);
  // In the order of the lists given.
  return [...teams, ...players].filter((x, i, all) => found.has(x) && all.indexOf(x) === i);
}

/** First picture in the text, for a post saved without a featured image. */
export const firstImage = (html: string) => html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];

/** Gives every picture in the text a description (the title) when it has none. */
export const fillImageAlts = (html: string, alt: string) =>
  html.replace(/<img\b([^>]*)>/gi, (m, attrs: string) => {
    const a = attrs.replace(/\s*\/$/, "");
    if (/\balt\s*=\s*["'][^"']+["']/i.test(a)) return m;
    const clean = a.replace(/\s*\balt\s*=\s*(["'])\s*\1/i, "");
    return `<img${clean} alt="${alt.replace(/"/g, "&quot;")}">`;
  });
