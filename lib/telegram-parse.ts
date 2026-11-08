// Reads a Telegram channel post into a news post: the 🌍 at the end marks a post for the
// site, the line starting with 🔸 is the headline, hashtags become tags, and the
// channel's own sign-off lines (its @id, t.me link, "join us") are left out.

export const PUBLISH_MARK = "🌍";
export const TITLE_MARK = "🔸";

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

/** Does the post end with 🌍 (ignoring spaces, hashtags and the channel's sign-off after it)? */
export function isForSite(text: string): boolean {
  const lines = text.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes(PUBLISH_MARK)) return true;
    if (!isSignOff(lines[i]) && !/^(#\S+\s*)+$/.test(lines[i])) return false;
  }
  return false;
}

/** The channel's sign-off: an @id, a t.me / channel link, "join"/"عضو شوید", or only emoji. */
function isSignOff(line: string): boolean {
  const l = line.replace(EMOJI, "").trim();
  if (!l) return true;
  return (
    /^(@\w{4,}\s*)+$/.test(l) ||
    /^(https?:\/\/)?(t\.me|telegram\.me)\/\S+$/i.test(l) ||
    /(عضو\s*شوید|عضویت|join\s*us|کانال\s*ما|به\s*ما\s*بپیوندید|👇)/i.test(line) && l.length < 60 && (/@\w{4,}|t\.me\//i.test(l) || l.length < 25)
  );
}

export type ParsedPost = { title: string; paragraphs: string[]; tags: string[] };

export function parsePost(text: string): ParsedPost {
  const lines = text.replace(/\r/g, "").split("\n");
  // Hashtags anywhere become tags ("#نساجی_مازندران" → "نساجی مازندران").
  const tags = [...new Set([...text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].replace(/_/g, " ").trim()).filter((t) => t.length > 1))];
  const titleAt = lines.findIndex((l) => l.includes(TITLE_MARK));
  const clean = (l: string) => l.replace(EMOJI, " ").replace(/#[\p{L}\p{N}_]+/gu, " ").replace(/\s+/g, " ").trim();
  const pick = titleAt >= 0 ? titleAt : lines.findIndex((l) => clean(l));
  const title = clean(lines[pick] ?? "").replace(/^[\s:،\-–]+|[\s:،\-–]+$/g, "");
  // Body: everything else, without the 🌍 line's mark, hashtag-only lines and the sign-off at the end.
  const body = lines.filter((_, i) => i !== pick).map((l) => l.replace(PUBLISH_MARK, "").trimEnd());
  while (body.length && (!body.at(-1)!.trim() || isSignOff(body.at(-1)!) || /^(#\S+\s*)+$/.test(body.at(-1)!.trim()))) body.pop();
  const paragraphs = body
    .join("\n")
    .split(/\n\s*\n|\n/)
    .map((p) => p.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/^[\s\u{1F538}\u{1F539}\u{25AA}\u{25AB}▫️▪️•◾◽🔻🔺✅☑️⚽️⚽]+/u, "").replace(/\s+/g, " ").trim())
    .filter((p) => p && p.replace(EMOJI, "").trim());
  return { title, paragraphs, tags };
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Paragraphs → HTML, with web addresses as links. */
export function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`)
    .join("");
}
