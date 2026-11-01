import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { routeFromHash, homeParams, REDIRECTS } from "../src/routes.js";
import { searchRuns, repoList, rowShape, groupRuns } from "../src/task-list.js";
import { stageBlocks, stageSummary } from "../src/stage-blocks.js";
import { createComposer } from "../src/composer.js";
import { renderHome, renderQueue, renderSearch, renderRepoSwitcher, renderTaskList } from "../public/view-home.js";
import { renderStageBlocks } from "../public/view-run.js";

const X = "<script>alert(1)</script>";
const now = Date.parse("2026-01-02T00:00:00Z");
const fixture = [
  { id: 1, title: "Fix login", repo: "o/x", branch: "fix", status: "waiting", stage: "plan", updated_at: "2026-01-01T23:00:00Z", cost: 9, model: "m1" },
  { id: 2, title: "Add chart", repo: "o/y", branch: "chart", status: "running", diffstat: { added: 3, removed: 1 }, updated_at: "2026-01-01T23:59:00Z" },
  { id: 3, title: "Docs", repo: "o/y", status: "merged", stage: "pr", updated_at: "2025-12-30T00:00:00Z" },
];

test("shell: three regions, no nav rail", () => {
  const html = readFileSync("public/index.html", "utf8");
  for (const id of ["left", "view", "pane"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /<nav|class="rail"|id="nav"/);
});

test("shell: each redirect target resolves to a view that is not a redirect", () => {
  for (const k of Object.keys(REDIRECTS)) {
    assert.equal(routeFromHash(`#/${k}`).view, "redirect");
    assert.notEqual(routeFromHash(`#/${REDIRECTS[k]}`).view, "redirect");
  }
  assert.equal(routeFromHash("#/home?group=done").view, "home");
  assert.deepEqual(homeParams("#/home?group=done"), { group: "done" });
  assert.deepEqual(homeParams("#/home?group=bogus"), { group: "all" });
  assert.deepEqual(homeParams("#/home"), { group: "all" });
});

test("rows: every fixture row has four facts, group counts, no dollar or model", () => {
  assert.ok(fixture.every(rowShape));
  const g = groupRuns(fixture);
  assert.deepEqual([g.needs.length, g.running.length, g.done.length], [1, 1, 1]);
  const html = renderTaskList(fixture, now);
  assert.match(html, /Needs you <span class="count">1/);
  assert.doesNotMatch(html, /\$|m1|cost|model/);
  assert.deepEqual(repoList(fixture), ["o/x", "o/y"]);
  assert.equal(searchRuns(fixture, "CHART").length, 1);
  assert.equal(searchRuns(fixture, "o/y").length, 2);
  assert.equal(searchRuns(fixture, "").length, 3);
});

test("stage blocks: header summaries match the run", () => {
  const run = { risk: { level: "medium" }, files: [{ added: 2, removed: 1 }, { added: 1, removed: 0 }], approved_by: "sam", checks: [{ status: "pass" }, { status: "fail" }], pr: { state: "open" } };
  assert.equal(stageSummary(run, "triage"), "medium risk, 2 files");
  assert.equal(stageSummary(run, "plan"), "approved by sam");
  assert.equal(stageSummary(run, "build"), "+3 −1");
  assert.equal(stageSummary(run, "verify"), "1/2 checks");
  assert.equal(stageSummary(run, "pr"), "open");
  const stages = ["triage", "plan", "build"].map((name) => ({ name, state: "done" }));
  const blocks = stageBlocks(run, stages, []);
  assert.equal(blocks[2].summary, "+3 −1");
  assert.ok(blocks.every((b) => !b.open));
});

test("stage blocks: collapsed html has no steps, expanded lists them, full text is one more expand", () => {
  const stages = [{ name: "build", state: "done" }];
  const events = [{ stage: "build", text: "edited a", detail: "FULLBODY" }];
  const closed = renderStageBlocks(stageBlocks({}, stages, events));
  assert.doesNotMatch(closed, /<details[^>]* open/);
  assert.doesNotMatch(closed, /edited a/);
  const opened = renderStageBlocks(stageBlocks({}, stages, events, { open: ["build"] }));
  assert.match(opened, /edited a/);
  assert.match(opened, /data-full="build"/);
  assert.doesNotMatch(opened, /FULLBODY/);
  assert.match(renderStageBlocks(stageBlocks({}, stages, events, { open: ["build"], full: ["build"] })), /FULLBODY/);
});

test("composer: chips, disabled send with two repos, steer queue with Undo", () => {
  const c = createComposer({ repos: ["a", "b"], branches: ["main"], agents: ["x"], runners: ["r"] });
  const opts = { repos: ["a", "b"], branches: ["main"], agents: ["x"], runners: ["r"] };
  const home = renderHome(c.state, opts, c.canSend("hi"), fixture, now);
  for (const n of ["repo", "branch", "agent", "runner", "mode"]) assert.match(home, new RegExp(`name="${n}"`));
  assert.match(home, /<option value="ask"/);
  assert.match(home, /type="submit" disabled/);
  assert.match(home, /Needs you <span class="count">1/);
  assert.ok(home.indexOf("<form") < home.indexOf("Needs you"));
  const s = c.steer("nudge");
  const q = renderQueue(c.state.queue);
  assert.match(q, /nudge/);
  assert.match(q, new RegExp(`data-undo="${s.id}"`));
  c.undo(s.id);
  assert.equal(renderQueue(c.state.queue), "");
});

test("home renderers escape interpolated values", () => {
  const bad = [{ id: X, title: X, repo: X, branch: X, status: "waiting", stage: X, updated_at: "2026-01-01T00:00:00Z" }];
  const c = createComposer({ repos: [X] });
  const html = renderHome(c.state, { repos: [X] }, false, bad, now) + renderQueue([{ id: X, text: X }]) + renderSearch(X) + renderRepoSwitcher([X], X);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
