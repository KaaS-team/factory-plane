import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPane, renderTabs, renderBatch, renderPreview, renderCost } from "../public/view-pane.js";
import { renderPalette, renderSegments, renderPhoneTabs, renderSheet } from "../public/view-palette.js";
import { keyAction, commandAction } from "../public/keys.js";
import { diffLines, createBatch } from "../src/line-comments.js";
import { COMMANDS, PAGES } from "../src/palette.js";
import { routeFromHash } from "../src/routes.js";

const OK = "https://raw.githubusercontent.com/o/r/factory/assets/a.png";
const run = {
  id: "1", repo: "o/r", status: "awaiting_approval",
  risk: { level: "medium", reason: "images" },
  acceptance: [{ text: "pane has tabs", done: true }],
  files: [{ path: "a.js", added: 2, removed: 1, patch: "@@ -1,2 +10,3 @@\n ctx\n-old\n+new\n+more\n\\ No newline at end of file" }],
  checks: [{ name: "lint", status: "pass" }],
  screenshots: [{ state: "home", viewport: 1440, theme: "dark", before: OK, after: OK }],
  cost: { tokens: 12 },
};
const tabIds = (html) => [...html.matchAll(/data-tab="(\w+)"/g)].map((m) => m[1]);

test("pane: viewer sees four tabs and no Cost, operator sees five", () => {
  assert.deepEqual(tabIds(renderTabs("outcome", { role: "viewer" })), ["outcome", "changes", "checks", "preview"]);
  assert.equal(tabIds(renderTabs("outcome", { role: "operator" })).length, 5);
  assert.ok(!renderPane(run, "cost", { role: "viewer" }).includes("Tokens"));
  assert.ok(renderPane(run, "cost", { role: "operator" }).includes("Tokens: 12"));
  assert.ok(!renderCost(run).includes("$"));
});

test("pane: Outcome carries the risk line above the checklist", () => {
  const html = renderPane(run, "outcome", null);
  assert.ok(html.indexOf("Risk: medium. images") > 0);
  assert.ok(html.indexOf("Risk:") < html.indexOf("pane has tabs"));
});

test("pane: Changes shows the file tree with counts and commentable diff lines", () => {
  const html = renderPane(run, "changes", null);
  assert.match(html, /a\.js \+2 −1/);
  assert.match(html, /data-file="a\.js" data-line="11"/);
  assert.ok(!/data-line="[^"]*"[^>]*>-old/.test(html), "removed lines are not commentable");
  assert.deepEqual(diffLines("a.js", run.files[0].patch).map((l) => l.line), [null, 10, null, 11, 12]);
});

test("pane: checks tab lists checks", () => {
  assert.match(renderPane(run, "checks", null), /lint: pass/);
});

test("preview: before and after render as two lazy images with alt text", () => {
  const html = renderPreview(run);
  assert.equal((html.match(/<img /g) || []).length, 2);
  assert.equal((html.match(/loading="lazy"/g) || []).length, 2);
  assert.match(html, /alt="After: home 1440 dark"/);
});

test("preview: a foreign url is dropped and a missing before reads new screen", () => {
  const html = renderPreview({ repo: "o/r", screenshots: [{ state: "x", viewport: 375, theme: "light", before: "https://evil.example/a.png", after: OK }] });
  assert.ok(!html.includes("evil.example"));
  assert.match(html, /new screen/);
  assert.equal((html.match(/<img /g) || []).length, 1);
  assert.ok(!renderPreview({ repo: "other/repo", screenshots: run.screenshots }).includes("<img"));
  assert.match(renderPreview({ repo: "o/r", screenshots: [] }), /No screenshots/);
});

test("comments: chips render with remove buttons and the batch prefixes the next send", () => {
  const b = createBatch();
  b.add("a.js", 11, "+new");
  b.add("b.js", 2, "x");
  const chips = renderBatch(b.items);
  assert.equal((chips.match(/data-remove=/g) || []).length, 2);
  assert.match(chips, /a\.js:11/);
  assert.equal(b.send("go"), "> a.js:11\n> +new\n\n> b.js:2\n> x\n\ngo");
  assert.equal(renderBatch(b.items), "");
  b.undo();
  assert.equal(b.items.length, 2);
});

test("palette: Ctrl+K and Cmd+K open it, Escape closes only when open", () => {
  assert.equal(keyAction({ key: "k", ctrlKey: true }, {}), "open-palette");
  assert.equal(keyAction({ key: "K", metaKey: true }, {}), "open-palette");
  assert.equal(keyAction({ key: "Escape" }, { paletteOpen: true }), "close-palette");
  assert.equal(keyAction({ key: "Escape" }, { paletteOpen: false }), null);
});

test("palette: a approves only when the run awaits approval and focus is not typing", () => {
  assert.equal(keyAction({ key: "a", target: { tagName: "BODY" } }, { run }), "approve");
  assert.equal(keyAction({ key: "a", target: { tagName: "BODY" } }, { run: { status: "running" } }), null);
  assert.equal(keyAction({ key: "a", target: { tagName: "TEXTAREA" } }, { run }), null);
  assert.equal(keyAction({ key: "a", target: { tagName: "BODY" } }, { run, paletteOpen: true }), null);
  assert.equal(commandAction(COMMANDS.find((c) => c.id === "approve"), { status: "running" }), null);
  assert.deepEqual(commandAction(COMMANDS.find((c) => c.id === "approve"), run), { act: "approve" });
});

test("palette: every page command routes to a view or a redirect", () => {
  for (const p of PAGES) {
    const cmd = COMMANDS.find((c) => c.page === p);
    const { go } = commandAction(cmd, null);
    const r = routeFromHash(go);
    assert.ok(r.view === p || r.view === "redirect", p);
  }
  const html = renderPalette(COMMANDS, 1);
  assert.match(html, /aria-selected="true"[^>]*>Open runs|data-cmd="page:runs"/);
  assert.equal((html.match(/role="option"/g) || []).length, COMMANDS.length);
});

test("phone: three segments, three tabs, sheet holds Approve plan then Plan approved", () => {
  assert.equal((renderSegments("Running", { Running: 2 }).match(/data-segment=/g) || []).length, 3);
  assert.equal((renderPhoneTabs("Steps").match(/data-ptab=/g) || []).length, 3);
  assert.match(renderSheet({ awaiting: true }), /data-action="approve">Approve plan/);
  assert.match(renderSheet({ awaiting: false }), /data-action="approve" disabled/);
  assert.match(renderSheet({ approved: true }), /Plan approved/);
  assert.match(renderSheet({}), /Request changes/);
});

test("phone: no bottom tab bar markup or css, one column under 600px", () => {
  const css = readFileSync("public/styles.css", "utf8");
  const html = readFileSync("public/index.html", "utf8");
  assert.ok(!/bottom-?tabs|tabbar/i.test(css + html));
  assert.match(css, /@media \(max-width: 599px\)/);
  assert.match(css, /#newtask/);
});

test("design rules: focus, reduced motion, dark, no em dash, no model names, no prices", () => {
  const css = readFileSync("public/styles.css", "utf8");
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /prefers-color-scheme: dark/);
  for (const f of ["app.js", "keys.js", "view-pane.js", "view-palette.js", "styles.css", "index.html"]) {
    const t = readFileSync(`public/${f}`, "utf8");
    assert.ok(!t.includes("—"), `${f} has an em dash`);
    assert.ok(!/claude|sonnet|opus|haiku|gpt/i.test(t), `${f} names a model`);
    assert.ok(!/\$\d/.test(t), `${f} shows a price`);
  }
});
