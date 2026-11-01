// Reproduces the audit screenshots. Run: node docs/audit-shots/shoot.mjs (needs playwright).
import { createRequire } from "node:module";
import { createServer } from "../../src/server.js";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const repo = "KaaS-team/demo";
const now = new Date().toISOString();
const runs = [
  { id: "r1", title: "Add login", repo, branch: "feat/login", status: "waiting", stage: "plan", updated_at: now },
  { id: "r2", title: "Fix typo", repo: "KaaS-team/other", branch: "fix/typo", status: "running", stage: "build", updated_at: now },
  { id: "r3", title: "Bump deps", repo, branch: "chore/deps", status: "done", diffstat: { added: 4, removed: 2 }, updated_at: now },
];
const detail = { ...runs[0], status: "awaiting_approval", risk: { level: "low", reason: "small" }, files: [{ path: "a.js", added: 1, removed: 0, patch: "@@ -1,1 +1,2 @@\n x\n+y" }],
  stages: [{ name: "triage", state: "done" }, { name: "plan", state: "live" }], events: [{ stage: "triage", text: "read" }],
  screenshots: [{ state: "home", viewport: 1440, theme: "light", after: `https://raw.githubusercontent.com/${repo}/factory/assets/a.png` }], acceptance: [{ text: "works", done: false }] };
const srv = createServer().listen(0);
await new Promise((r) => srv.once("listening", r));
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch();
const out = {};
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route("**/api/**", (route) => {
    const u = new URL(route.request().url()).pathname;
    if (u === "/api/runs") return route.fulfill({ json: runs });
    if (u === "/api/runs/r1") return route.fulfill({ json: detail });
    if (u === "/api/me") return route.fulfill({ json: { role: "viewer" } });
    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(base + "/");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/audit-shots/home-${w}.png` });
  await page.goto(base + "/#/run/r1");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/audit-shots/run-${w}.png` });
  out[w] = { errors, scrollW: await page.evaluate(() => document.documentElement.scrollWidth), text: (await page.innerText("body")).slice(0, 400) };
  await page.close();
}
await browser.close(); srv.close();
console.log(JSON.stringify(out, null, 1));
