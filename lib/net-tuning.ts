// Network settings for the server's outside connections (Telegram, Footballi, the
// league site). Node tries a host's IPv6 and IPv4 addresses in turn and, by default,
// gives each attempt only 250 ms before cancelling it; on a slow link (common for
// servers in Iran) every attempt is cancelled and fetch fails with "AggregateError"
// although curl connects. Each attempt now gets a few seconds.
import net from "node:net";

try {
  if (net.getDefaultAutoSelectFamilyAttemptTimeout() < 3000) net.setDefaultAutoSelectFamilyAttemptTimeout(3000);
} catch {
  /* older Node: nothing to tune */
}

/** "AggregateError" → the real reasons, e.g. "ETIMEDOUT 149.154.167.220, ENETUNREACH 2001:67c:…". */
export function networkReason(e: unknown): string {
  const err = e as Error & { cause?: unknown; errors?: unknown[]; code?: string };
  const inner = (err.cause ?? err) as Error & { errors?: (Error & { code?: string; address?: string })[]; code?: string; address?: string };
  if (inner.errors?.length) return inner.errors.map((x) => [x.code, x.address].filter(Boolean).join(" ") || x.message).join("، ");
  return [inner.code, inner.address].filter(Boolean).join(" ") || inner.message || String(e);
}

/** fetch with retries for network failures (not for HTTP errors): 3 tries, 1 s and 3 s apart. */
export async function fetchRetry(url: string, init: RequestInit & { timeoutMs?: number } = {}, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 25_000) });
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, i === 0 ? 1000 : 3000));
    }
  }
  throw last;
}
