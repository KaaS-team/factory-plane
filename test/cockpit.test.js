import test from "node:test";
import assert from "node:assert/strict";
import { paneTabs, riskLine, fileTree } from "../src/pane.js";
import { createBatch, newStartOfHunk } from "../src/line-comments.js";
import { previewShots } from "../src/preview.js";
import { COMMANDS, PAGES, match, shortcutAction, createPalette } from "../src/palette.js";
import { SEGMENTS, SHEET_ACTIONS, hasBottomTabBar, isPhone } from "../src/phone.js";

test("viewer sees four tabs, operator five with cost", () => {
  assert.deepEqual(paneTabs({ role: "viewer" }).map((t) => t[0]), ["outcome", "changes", "checks", "preview"]);
  assert.equal(paneTabs({ role: "operator" }).length, 5);
  assert.equal(paneTabs(null).length, 4);
  assert.match(riskLine({ level: "medium", reason: "images" }), /medium.*images/);
  assert.match(fileTree([{ path: "b", added: 2, removed: 1 }, { path: "a" }])[1].label, /b \+2 −1/);
});

test("line comments batch with file and line, send clears, undo restores", () => {
  const b = createBatch();
  b.add("src/a.js", 3, "x");
  b.add("src/b.js", 9, "y");
  assert.equal(b.items.length, 2);
  const out = b.send("fix");
  assert.equal(out, "> src/a.js:3\n> x\n\n> src/b.js:9\n> y\n\nfix");
  assert.equal(b.items.length, 0);
  b.undo();
  assert.equal(b.items.length, 2);
  assert.equal(newStartOfHunk("@@ -1,2 +40,5 @@ fn"), 40);
});

test("preview drops foreign urls and marks new screens", () => {
  const ok = "https://raw.githubusercontent.com/o/r/factory/assets/a.png";
  const [p, q] = previewShots("o/r", [
    { state: "home", viewport: 1440, theme: "dark", before: ok, after: ok },
    { state: "x", viewport: 375, theme: "light", before: "https://evil.example/a.png", after: ok },
  ]);
  assert.ok(p.before && p.after && !p.newScreen);
  assert.equal(q.before, null);
  assert.equal(q.newScreen, true);
  assert.equal(p.alt, "home 1440 dark");
});

test("palette reaches every page, gates approve, restores focus", () => {
  const pages = new Set(COMMANDS.map((c) => c.page).filter(Boolean));
  for (const p of PAGES) assert.ok(pages.has(p), p);
  assert.equal(match("fle")[0].page, "fleet");
  assert.equal(shortcutAction("a", { status: "running" }), null);
  assert.equal(shortcutAction("a", { status: "awaiting_approval" }), "approve");
  let active = "composer";
  const pal = createPalette(() => active);
  pal.show();
  active = "palette-input";
  assert.equal(pal.close(), "composer");
});

test("phone has no bottom tab bar, three segments, sheet holds Approve plan", () => {
  assert.equal(hasBottomTabBar(375), false);
  assert.equal(SEGMENTS.length, 3);
  assert.ok(SHEET_ACTIONS.includes("Approve plan"));
  assert.ok(isPhone(375) && !isPhone(1440));
});
