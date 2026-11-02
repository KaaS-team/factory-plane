import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderTaskList } from "../public/view-home.js";

const now = Date.parse("2026-01-01T00:00:00Z");
const runs = [
  { id: "r1", repo: "a/b", branch: "x", status: "running", stage: "build", updated_at: "2026-01-01T00:00:00Z", title: "Run one" },
];
const count = (html, s) => html.split(s).length - 1;

test("only running renders a single Running section", () => {
  const html = renderTaskList(runs, now, { only: "running" });
  assert.equal(count(html, 'class="group"'), 1);
  assert.match(html, /aria-label="Running"/);
  assert.doesNotMatch(html, /Needs you/);
  assert.doesNotMatch(html, /Done/);
});

test("only done with no done runs shows Nothing here and no rows", () => {
  const html = renderTaskList(runs, now, { only: "done" });
  assert.match(html, /Nothing here\./);
  assert.doesNotMatch(html, /<li>/);
});

test("default call keeps three sections in order", () => {
  const html = renderTaskList(runs, now);
  assert.equal(count(html, 'class="group"'), 3);
  const at = ["Needs you", "Running", "Done"].map((l) => html.indexOf(`aria-label="${l}"`));
  assert.ok(at[0] >= 0 && at[0] < at[1] && at[1] < at[2]);
});

test("app.js passes only: keys[segment] on the phone branch", () => {
  assert.ok(readFileSync(new URL("../public/app.js", import.meta.url), "utf8").includes("only: keys[segment]"));
});
