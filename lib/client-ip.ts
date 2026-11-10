// The visitor's address for rate limits. nginx sets X-Real-IP from the connection itself
// (a client can't change it); the first X-Forwarded-For entry is whatever the client sent,
// so it is used only when the app runs without nginx in front (development).
export function clientIp(h: { get(name: string): string | null }): string {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return chain.at(-1) || "local";
}
