// Posts from WordPress carry the old editor's text colours inline (black, dark grey,
// white table cells). On the dark theme they become unreadable. Neutral colours are
// the theme's job, so they are removed; real colours (red text, a yellow highlight)
// are kept, and a kept highlight gets dark text so it stays readable.

const NAMED: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], gray: [128, 128, 128], grey: [128, 128, 128], silver: [192, 192, 192],
  darkgray: [169, 169, 169], darkgrey: [169, 169, 169], dimgray: [105, 105, 105], dimgrey: [105, 105, 105],
  lightgray: [211, 211, 211], lightgrey: [211, 211, 211], gainsboro: [220, 220, 220], whitesmoke: [245, 245, 245],
  red: [255, 0, 0], yellow: [255, 255, 0], blue: [0, 0, 255], navy: [0, 0, 128], green: [0, 128, 0], maroon: [128, 0, 0],
};

function parseColor(v: string): [number, number, number] | undefined {
  const c = v.trim().toLowerCase().replace(/\s*!important$/, "");
  if (NAMED[c]) return NAMED[c];
  let m = c.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    const h = m[1].length <= 4 ? [...m[1].slice(0, 3)].map((x) => x + x).join("") : m[1].slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return undefined;
}

/** Lightness and saturation (HSL, 0–1). */
function hsl([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { l, s };
}

/** Black, white, greys, and colours too dark to read on a dark page. */
const neutralOrDarkText = (rgb: [number, number, number]) => {
  const { l, s } = hsl(rgb);
  return s < 0.25 || l < 0.3;
};
/** White and grey page-like backgrounds. */
const plainBackground = (rgb: [number, number, number]) => {
  const { l, s } = hsl(rgb);
  return s < 0.25 || l > 0.85;
};

function fixStyle(style: string): string {
  const decls = style.split(";").map((d) => d.trim()).filter(Boolean);
  const out: string[] = [];
  let keptBackground = false;
  let hasColor = false;
  for (const d of decls) {
    const i = d.indexOf(":");
    if (i < 0) continue;
    const prop = d.slice(0, i).trim().toLowerCase();
    const value = d.slice(i + 1).trim();
    if (prop === "color") {
      const rgb = parseColor(value);
      if (rgb && neutralOrDarkText(rgb)) continue;
      hasColor = true;
    } else if (prop === "background-color" || prop === "background") {
      const rgb = parseColor(value);
      if (rgb && plainBackground(rgb)) continue;
      if (rgb) keptBackground = true;
    }
    out.push(`${prop}: ${value}`);
  }
  // A highlight colour that stays needs dark text on it in either theme.
  if (keptBackground && !hasColor) out.push("color: #1a1a1a");
  return out.join("; ");
}

export function fixInlineColors(html: string): string {
  return html
    .replace(/\sstyle\s*=\s*(["'])([^"']*)\1/gi, (m, q: string, style: string) => {
      if (!/color|background/i.test(style)) return m;
      const fixed = fixStyle(style);
      return fixed ? ` style=${q}${fixed}${q}` : "";
    })
    .replace(/<font\b([^>]*)>/gi, (m, attrs: string) => {
      const c = attrs.match(/\bcolor\s*=\s*["']?([^"'\s>]+)/i)?.[1];
      const rgb = c ? parseColor(c) : undefined;
      return rgb && neutralOrDarkText(rgb) ? `<font${attrs.replace(/\s*\bcolor\s*=\s*["']?[^"'\s>]+["']?/i, "")}>` : m;
    })
    .replace(/\sbgcolor\s*=\s*["']?([^"'\s>]+)["']?/gi, (m, c: string) => {
      const rgb = parseColor(c);
      return rgb && plainBackground(rgb) ? "" : m;
    });
}
