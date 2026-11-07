// Cleans post HTML written in the admin editor before it is saved. Writers can edit
// HTML, so anything that could run code for visitors (or for an admin reading the
// site) is removed: scripts and other active elements, event handlers, javascript:
// links. Embeds are kept only from known video sites.

const DROP_WITH_CONTENT = /<(script|style|noscript|template|object|embed|applet|form|textarea|select|button|base|meta|link|frameset|frame|svg|math)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;
const DROP_TAG = /<\/?(script|style|noscript|template|object|embed|applet|form|input|textarea|select|option|button|base|meta|link|frameset|frame|svg|math|html|head|body)\b[^>]*>/gi;
const EMBED_HOSTS = /^https:\/\/(www\.)?(aparat\.com|youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;

const safeUrl = (u: string) => {
  const v = u.replace(/[\u0000- \u007f]+/g, "").toLowerCase();
  if (/^(javascript|vbscript|data|file):/.test(v)) {
    // Pasted images can be data: pictures; nothing else.
    return /^data:image\/(png|jpe?g|gif|webp|avif);/.test(v);
  }
  return true;
};

export function sanitizeHtml(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, "").replace(DROP_WITH_CONTENT, "").replace(DROP_TAG, "");
  // Iframes only from video sites.
  out = out.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe\s*>|<iframe\b([^>]*)\/?>/gi, (m, a1, _c, a2) => {
    const src = (a1 ?? a2 ?? "").match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    return EMBED_HOSTS.test(src) ? `<iframe src="${src}" allowfullscreen loading="lazy"></iframe>` : "";
  });
  // Attributes: no event handlers, no style tricks with expressions, safe URLs only.
  out = out.replace(/<([a-z][a-z0-9]*)\b([^>]*)>/gi, (m, tag: string, attrs: string) => {
    if (tag.toLowerCase() === "iframe") return m;
    const kept: string[] = [];
    for (const a of attrs.matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g)) {
      const name = a[1].toLowerCase();
      const raw = a[2] ?? "";
      const value = raw.replace(/^["']|["']$/g, "");
      if (name.startsWith("on") || name === "srcdoc" || name === "formaction") continue;
      if (["href", "src", "poster", "srcset", "action", "xlink:href", "background"].includes(name) && !value.split(",").every((part) => safeUrl(part.trim().split(/\s+/)[0] ?? ""))) continue;
      if (name === "style" && /expression\s*\(|url\s*\(\s*['"]?\s*javascript:|behavior\s*:/i.test(value)) continue;
      kept.push(raw ? `${a[1]}=${raw.startsWith('"') || raw.startsWith("'") ? raw : `"${raw}"`}` : a[1]);
    }
    return `<${tag}${kept.length ? " " + kept.join(" ") : ""}>`;
  });
  return out;
}
