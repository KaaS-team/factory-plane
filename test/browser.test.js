// Real-browser checks of the served page. Skipped when playwright is not installed.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "../src/server.js";

let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)("playwright")); } catch { /* skipped below */ }
const skip = chromium ? false : "playwright not installed";

const repo = "KaaS-team/demo";
const detail = { id: "r1", title: "Add login", repo, branch: "b", status: "awaiting_approval", stage: "plan", updated_at: new Date().toISOString(),
  risk: { level: "low" }, stages: [{ name: "plan", state: "live" }] };

async function withPage(width, role, fn) {
  const srv = createServer().listen(0);
  await new Promise((r) => srv.once("listening", r));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.route("**/api/**", (route) => {
      const u = new URL(route.request().url()).pathname;
      if (u === "/api/runs") return route.fulfill({ json: [detail] });
      if (u === "/api/runs/r1") return route.fulfill({ json: detail });
      if (u === "/api/me") return route.fulfill({ json: { role } });
      return route.fulfill({ status: 404, body: "" });
    });
    await page.goto(`http://127.0.0.1:${srv.address().port}/#/run/r1`);
    await page.waitForSelector("details[data-stage]");
    await page.waitForTimeout(200);
    await fn(page);
  } finally { await browser.close(); srv.close(); }
}

test("1440: an operator's five pane tabs fit on one row in the 360px pane", { skip }, async () => {
  await withPage(1440, "operator", async (page) => {
    const tops = await page.$$eval("#pane [role=tab]", (els) => els.map((e) => e.offsetTop));
    assert.equal(tops.length, 5);
    assert.equal(new Set(tops).size, 1, `tabs wrapped: ${tops}`);
    assert.equal(await page.evaluate(() => document.getElementById("pane").offsetWidth), 360);
  });
});

test("390: Request changes shows the composer and no page scrolls sideways", { skip }, async () => {
  await withPage(390, "viewer", async (page) => {
    assert.equal(await page.isVisible("#composer"), false);
    await page.click("[data-action=request-changes]");
    assert.equal(await page.isVisible("#composer textarea"), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  });
});
