/** Title → address part: "پیروزی نساجی!" → "پیروزی-نساجی". */
export const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
