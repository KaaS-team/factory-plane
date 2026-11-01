import test from "node:test";
import assert from "node:assert/strict";
import { BACKLOG_COLUMNS, columnForStage, buildBacklog } from "../src/backlog.js";

const NOW = Date.parse("2026-11-01T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const wf = { stages: [{ id: "plan" }, { id: "lint" }, { id: "verify" }, { id: "audit" }, { id: "pr" }] };
const where = (cols, id) => cols.find((c) => c.runs.some((r) => r.id === id)).id;

test("six backlog columns in order", () => {
  assert.deepEqual(BACKLOG_COLUMNS, ["intake", "triage", "plan", "build", "review", "done"]);
  assert.deepEqual(buildBacklog(wf, [], NOW).map((c) => c.id), BACKLOG_COLUMNS);
});

test("verify and pr land in review, custom step before verify in build, after in review", () => {
  assert.equal(columnForStage("verify", wf), "review");
  assert.equal(columnForStage("pr", wf), "review");
  assert.equal(columnForStage("lint", wf), "build");
  assert.equal(columnForStage("audit", wf), "review");
});

test("parked run keeps its column with needsYou and badge, never done", () => {
  const cols = buildBacklog(wf, [
    { id: 1, stage: "verify", parkedLabel: "needs-human" },
    { id: 2, stage: "build", parkedLabel: "blocked", shippedAt: NOW - DAY },
    { id: 3, stage: "verify" },
  ], NOW);
  assert.equal(where(cols, 1), "review");
  assert.equal(where(cols, 2), "build");
  const r1 = cols.find((c) => c.id === "review").runs.find((r) => r.id === 1);
  assert.equal(r1.needsYou, true);
  assert.equal(r1.badge, "needs-human");
  assert.equal(cols.find((c) => c.id === "review").runs.find((r) => r.id === 3).needsYou, false);
});

test("shipped within 14 days lands in done, older does not", () => {
  const cols = buildBacklog(wf, [
    { id: 1, stage: "pr", shippedAt: NOW - 13 * DAY },
    { id: 2, stage: "pr", shippedAt: new Date(NOW - 15 * DAY).toISOString() },
  ], NOW);
  assert.equal(where(cols, 1), "done");
  assert.equal(where(cols, 2), "review");
});
