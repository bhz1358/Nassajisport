import test from "node:test";
import assert from "node:assert/strict";
import { can, canEditPost, roleOf, sectionOfPath } from "../lib/roles.ts";

test("users saved before roles existed are admins", () => {
  assert.equal(roleOf({}), "admin");
  assert.equal(roleOf(undefined), "admin");
  assert.equal(roleOf({ role: "writer" }), "writer");
});

test("each role opens only its sections", () => {
  assert.ok(can("admin", "users"));
  assert.ok(can("editor", "publish") && !can("editor", "users") && !can("editor", "settings"));
  assert.ok(can("writer", "posts") && can("writer", "media") && !can("writer", "publish") && !can("writer", "ads"));
  assert.ok(can("stats", "league") && can("stats", "squad") && !can("stats", "posts"));
});

test("panel paths map to sections", () => {
  assert.equal(sectionOfPath("/admin/squad/lineup/"), "squad");
  assert.equal(sectionOfPath("/admin/posts/12/"), "posts");
  assert.equal(sectionOfPath("/admin/"), undefined);
});

test("writers edit only their own unpublished posts", () => {
  assert.ok(canEditPost("writer", "ali", { createdBy: "ali", status: "draft" }));
  assert.ok(!canEditPost("writer", "ali", { createdBy: "ali", status: "publish" }));
  assert.ok(!canEditPost("writer", "ali", { createdBy: "reza", status: "draft" }));
  assert.ok(!canEditPost("writer", "ali", { status: "draft" }));
  assert.ok(canEditPost("editor", "x", { createdBy: "ali", status: "publish" }));
});
