import test from "node:test";
import assert from "node:assert/strict";
import { MAX_FIELDS, buildCard, createCardStore } from "../src/approval-card.js";

const f = (n) => Array.from({ length: n }, (_, i) => ({ k: `k${i}`, v: String(i) }));

test("card caps fields at 12 and reports the hidden count", () => {
  const c = buildCard({ runId: "r", seq: 1, title: "t", fields: f(15) });
  assert.equal(MAX_FIELDS, 12);
  assert.equal(c.fields.length, 12);
  assert.equal(c.hiddenFields, 3);
  assert.equal(buildCard({ runId: "r", seq: 1, title: "t", fields: f(5) }).hiddenFields, 0);
});

test("only the latest card of a run works", async () => {
  const s = createCardStore({ postBack: async () => {} });
  const a = s.issue("r1", { title: "a" });
  const b = s.issue("r1", { title: "b" });
  const other = s.issue("r2", { title: "c" });
  let ran = 0;
  assert.deepEqual(await s.act(a.id, "approve", async () => ran++), { ok: false, reason: "stale" });
  assert.equal(ran, 0);
  assert.equal((await s.act(b.id, "approve", async () => ran++)).ok, true);
  assert.equal((await s.act(other.id, "approve", async () => ran++)).ok, true);
  assert.equal(ran, 2);
});

test("failed approved action posts back and sets a retry banner, then can retry", async () => {
  const posted = [];
  const s = createCardStore({ postBack: async (r, m) => posted.push([r, m]) });
  const c = s.issue("r1", { title: "a" });
  const res = await s.act(c.id, "approve", async () => { throw new Error("boom"); });
  assert.equal(res.reason, "failed");
  assert.equal(posted.length, 1);
  assert.equal(posted[0][0], "r1");
  assert.match(posted[0][1], /boom/);
  assert.equal(c.banner.kind, "retry");
  assert.equal(c.status, "open");
  assert.equal((await s.act(c.id, "approve", async () => {})).ok, true);
  assert.equal(c.banner, null);
  assert.equal(c.status, "approved");
});
