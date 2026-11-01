// Gaps found by the cockpit audit (docs/audit-cockpit.md).
import test from "node:test";
import assert from "node:assert/strict";
import { actionEffect, commandAction } from "../public/keys.js";
import { renderSettings } from "../public/view-settings.js";
import { PAGES, COMMANDS } from "../src/palette.js";

test("gear menu lists every page as a link to its hash", () => {
  const html = renderSettings({}, PAGES);
  for (const p of PAGES) assert.ok(html.includes(`<a href="#/${p}">${p}</a>`), p);
});

test("Request changes and New task reveal the composer (hidden under 600px)", () => {
  for (const name of ["request-changes", "new-task"]) {
    const fx = actionEffect(name, null);
    assert.equal(fx.compose, true, name);
    assert.ok(fx.focus);
  }
});

test("every non-page palette command does something", () => {
  const run = { status: "awaiting_approval", pr: { url: "https://github.com/o/r/pull/1" } };
  for (const c of COMMANDS.filter((c) => !c.page)) {
    const r = commandAction(c, run);
    assert.ok(r, c.id);
    if (r.act && r.act !== "approve") assert.ok(actionEffect(r.act, run), c.id);
  }
});

test("open-pr opens only an https url from the run", () => {
  assert.deepEqual(actionEffect("open-pr", { pr: { url: "https://github.com/o/r/pull/1" } }), { openUrl: "https://github.com/o/r/pull/1" });
  assert.equal(actionEffect("open-pr", { pr: { url: "javascript:alert(1)" } }), null);
  assert.equal(actionEffect("open-pr", {}), null);
});

test("switch-repo goes home and focuses the repo switcher", () => {
  assert.deepEqual(actionEffect("switch-repo", null), { go: "#/home", focus: "#repo-switch" });
});
