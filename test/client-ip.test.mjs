import test from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/client-ip.ts";

const H = (o) => ({ get: (k) => o[k] ?? null });

test("nginx's X-Real-IP wins over a forged X-Forwarded-For", () => {
  assert.equal(clientIp(H({ "x-real-ip": "5.6.7.8", "x-forwarded-for": "1.1.1.1, 5.6.7.8" })), "5.6.7.8");
});
test("without X-Real-IP, the entry the proxy added (last), not the client's", () => {
  assert.equal(clientIp(H({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" })), "9.9.9.9");
  assert.equal(clientIp(H({})), "local");
});
