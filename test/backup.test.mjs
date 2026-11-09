import test from "node:test";
import assert from "node:assert/strict";
import { nightlyDue } from "../lib/backup-plan.ts";

const S = (x = {}) => ({ enabled: true, chats: [1], ...x });
const at = (iso) => Date.parse(iso);

test("from 3 a.m. Tehran, once a day", () => {
  assert.equal(nightlyDue(S(), at("2026-11-09T23:00:00Z"), true), false, "02:30 Tehran");
  assert.equal(nightlyDue(S(), at("2026-11-09T23:31:00Z"), true), true, "03:01 Tehran");
  assert.equal(nightlyDue(S({ lastDay: "2026-11-10" }), at("2026-11-10T10:00:00Z"), true), false, "sent today");
  assert.equal(nightlyDue(S({ lastDay: "2026-11-09" }), at("2026-11-10T10:00:00Z"), true), true, "yesterday's was sent");
});

test("a failed night is retried after an hour", () => {
  assert.equal(nightlyDue(S({ lastTry: "2026-11-10T00:00:00Z" }), at("2026-11-10T00:30:00Z"), true), false);
  assert.equal(nightlyDue(S({ lastTry: "2026-11-10T00:00:00Z" }), at("2026-11-10T01:01:00Z"), true), true);
});

test("off, no recipients or no bot token: never", () => {
  const t = at("2026-11-10T02:00:00Z");
  assert.equal(nightlyDue(S({ enabled: false }), t, true), false);
  assert.equal(nightlyDue(S({ chats: [] }), t, true), false);
  assert.equal(nightlyDue(S(), t, false), false);
});
