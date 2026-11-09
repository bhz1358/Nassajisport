// Reads a public channel's web preview (t.me/s/<channel>), which lists past posts
// page by page (?before=<id>). The Bot API can't read a channel's history, so this is
// how older posts are found for a first import.

export type WebPost = { id: number; date: string; text: string; photos: string[]; videos: string[] };

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");

/** The message text block's inner HTML (it can hold nested tags, so tags are counted). */
function textBlock(block: string): string {
  const start = block.search(/<div class="tgme_widget_message_text[^"]*"[^>]*>/);
  if (start < 0) return "";
  const open = block.indexOf(">", start) + 1;
  let depth = 1;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = open;
  for (let m = re.exec(block); m; m = re.exec(block)) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return block.slice(open, m.index);
  }
  return block.slice(open);
}

/** Message HTML → plain text with line breaks (emoji are kept: they sit inside <b> tags). */
export function webText(html: string): string {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function parseWebPage(html: string): WebPost[] {
  const out: WebPost[] = [];
  for (const block of html.split('<div class="tgme_widget_message_wrap').slice(1)) {
    const id = Number(block.match(/data-post="[^"/]+\/(\d+)"/)?.[1]);
    const date = block.match(/<time datetime="([^"]+)"/)?.[1];
    if (!id || !date) continue;
    const photos = [...block.matchAll(/tgme_widget_message_photo_wrap[^"]*"[^>]*?background-image:url\('([^']+)'\)/g)].map((m) => decode(m[1]));
    const videos = [...block.matchAll(/<video[^>]*\bsrc="([^"]+)"/g)].map((m) => decode(m[1]));
    out.push({ id, date: new Date(date).toISOString(), text: webText(textBlock(block)), photos: [...new Set(photos)], videos: [...new Set(videos)] });
  }
  return out;
}

/** "@nassajisport", "https://t.me/nassajisport" → "nassajisport". */
export const channelName = (c: string) => c.trim().replace(/^https?:\/\/(t|telegram)\.me\/(s\/)?/i, "").replace(/^@/, "").split(/[/?#]/)[0];
