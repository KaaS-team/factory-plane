// Real-browser checks of the three-pane shell, an old-page redirect and the composer.
// Skipped when playwright is not installed.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "../src/server.js";

let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)("playwright")); } catch { /* skipped below */ }
const skip = chromium ? false : "playwright not installed";

const repo = "KaaS-team/demo";
const now = new Date().toISOString();
const runs = [
  { id: "r1", title: "Add login", repo, branch: "feat-login", status: "awaiting_approval", stage: "plan", updated_at: now,
    risk: { level: "low" }, stages: [{ name: "plan", state: "live" }, { name: "build", state: "pending" }] },
  { id: "r2", title: "Fix cache", repo, branch: "fix-cache", status: "running", diffstat: { added: 4, removed: 2 }, updated_at: now },
];

async function withPage(hash, fn, width = 1440) {
  const srv = createServer().listen(0);
  await new Promise((r) => srv.once("listening", r));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route("**/api/**", (route) => {
      const u = new URL(route.request().url()).pathname;
      if (u === "/api/runs") return route.fulfill({ json: runs });
      const m = u.match(/^\/api\/runs\/(\w+)$/);
      if (m) return route.fulfill({ json: runs.find((r) => r.id === m[1]) });
      if (u === "/api/me") return route.fulfill({ json: { role: "operator" } });
      return route.fulfill({ status: 404, body: "" });
    });
    await page.goto(`http://127.0.0.1:${srv.address().port}/${hash}`);
    await page.waitForSelector("#list .row");
    await fn(page);
  } finally { await browser.close(); srv.close(); }
}

test("shell: task list left, selected task centre, context pane right", { skip }, async () => {
  await withPage("#/run/r1", async (page) => {
    await page.waitForSelector("details[data-stage]");
    await page.waitForSelector("#pane [role=tab]");
    const box = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; });
    const [left, view, pane] = [await box("#left"), await box("#view"), await box("#pane")];
    assert.ok(left.r <= view.l + 1, "list sits left of the centre");
    assert.ok(view.r <= pane.l + 1, "context sits right of the centre");
    assert.equal(await page.locator("#list .row").count(), 2);
    assert.equal(await page.locator("#list .row .l1").first().isVisible(), true);
    assert.equal(await page.locator("#list .row .l2").first().isVisible(), true);
    assert.equal(await page.locator("details[data-stage][open]").count(), 0, "stage blocks start collapsed");
  });
});

test("redirect: an old board link lands on the list", { skip }, async () => {
  await withPage("#/board", async (page) => {
    await page.waitForFunction(() => location.hash === "#/home?group=all");
    assert.equal(await page.locator("#list .row").count(), 2);
  });
});

test("composer: repo, branch, agent, runner chips and Ask or Build mode", { skip }, async () => {
  await withPage("#/home", async (page) => {
    const names = await page.$$eval("form.composer .chip select", (els) => els.map((e) => e.name));
    assert.deepEqual(names, ["repo", "branch", "agent", "runner", "mode"]);
    assert.deepEqual(await page.$$eval("select[name=mode] option", (o) => o.map((x) => x.textContent)), ["Build", "Ask"]);
    await page.selectOption("select[name=mode]", "ask");
    assert.equal(await page.inputValue("select[name=mode]"), "ask");
    assert.equal(await page.isDisabled("form.composer button[type=submit]"), true);
    await page.fill("form.composer textarea", "what changed?");
    assert.equal(await page.isDisabled("form.composer button[type=submit]"), false);
  });
});
