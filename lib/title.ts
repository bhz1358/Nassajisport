/**
 * Splits a headline for the gold highlight: the part before ":" if there is one,
 * otherwise the first two words. Shared by server and client components.
 */
export function splitTitle(title: string): [string, string] {
  const colon = title.indexOf(":");
  if (colon > 0 && colon < title.length - 1) return [title.slice(0, colon + 1), title.slice(colon + 1)];
  const words = title.split(" ");
  if (words.length < 4) return ["", title];
  return [words.slice(0, 2).join(" "), " " + words.slice(2).join(" ")];
}
