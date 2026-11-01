import test from "node:test";
import assert from "node:assert/strict";
import { routeFromHash, REDIRECTS } from "../src/routes.js";
import { groupRuns, rowShape, taskRow, filterByRepo } from "../src/task-list.js";
import { stageBlocks } from "../src/stage-blocks.js";
import { createComposer } from "../src/composer.js";

test("old page hashes redirect and empty hash is home", () => {
  for (const [k, v] of Object.entries(REDIRECTS)) {
    assert.deepEqual(routeFromHash(`#/${k}`), { view: "redirect", jobID: "", redirect: v });
  }
  assert.equal(routeFromHash("#/").view, "home");
  assert.equal(routeFromHash("#/settings").view, "settings");
});

const now = Date.parse("2026-01-02T00:00:00Z");
const runs = [
  { id: 1, title: "a", repo: "o/x", status: "waiting", stage: "plan", updated_at: "2026-01-01T23:00:00Z", cost: 5, model: "m" },
  { id: 2, title: "b", repo: "o/y", branch: "f", status: "running", diffstat: { added: 3, removed: 1 }, updated_at: "2026-01-01T23:59:30Z" },
  { id: 3, title: "c", repo: "o/y", status: "merged", stage: "pr", updated_at: "2025-12-30T00:00:00Z" },
];

test("rows group, carry four facts, and leak no cost or model", () => {
  const g = groupRuns(runs);
  assert.deepEqual([g.needs.length, g.running.length, g.done.length], [1, 1, 1]);
  assert.ok(runs.every(rowShape));
  assert.equal(rowShape({ repo: "r", status: "s", updated_at: "t" }), false);
  const row = taskRow(runs[1], now);
  assert.equal(row.line2.size, "+3 −1");
  assert.equal(row.line2.age, "30s");
  assert.equal(taskRow(runs[0], now).line2.size, "plan");
  assert.doesNotMatch(JSON.stringify(taskRow(runs[0], now)), /\$|"m"|cost|model/);
  assert.equal(filterByRepo(runs, "o/y").length, 2);
});

test("stage blocks start collapsed and expand to steps", () => {
  const stages = [{ name: "build", state: "done", summary: "+3 −1", durationMs: 65000 }, { name: "verify", state: "live" }];
  const events = [{ stage: "build", text: "edited a", detail: "full" }];
  const closed = stageBlocks({}, stages, events);
  assert.ok(closed.every((b) => !b.open && b.steps.length === 0));
  assert.equal(closed[0].duration, "1m 5s");
  const opened = stageBlocks({}, stages, events, { open: ["build"] });
  assert.equal(opened[0].steps.length, 1);
  assert.equal(opened[0].steps[0].detail, null);
  assert.equal(stageBlocks({}, stages, events, { open: ["build"], full: ["build"] })[0].steps[0].detail, "full");
});

test("composer gates send on repo, Ask vs Build, steer with undo", () => {
  const sent = [];
  const c = createComposer({ repos: ["a", "b"], branches: ["main"], agents: ["x"], runners: ["r"], onSend: (t) => sent.push(t) });
  assert.equal(c.canSend("hi"), false);
  assert.equal(c.send("hi"), null);
  c.pick("repo", "a");
  c.setMode("ask");
  assert.equal(c.send("hi").kind, "factory:ask");
  c.setMode("build");
  assert.equal(c.send("hi").kind, "ready");
  assert.equal(sent.length, 2);
  const s = c.steer("nudge");
  assert.equal(c.state.queue.length, 1);
  assert.equal(c.undo(s.id), true);
  assert.equal(c.state.queue.length, 0);
});
