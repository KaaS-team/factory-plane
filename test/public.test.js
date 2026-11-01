import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "../src/server.js";
import { esc } from "../public/html.js";
import { renderTaskList, renderComposer } from "../public/view-home.js";
import { renderStageBlocks } from "../public/view-run.js";
import { renderSettings } from "../public/view-settings.js";

const X = "<script>alert(1)</script>";
const clean = (html) => { assert.ok(!html.includes("<script>"), html); assert.ok(html.includes("&lt;script&gt;")); };

test("esc escapes script tags and quotes", () => {
  clean(esc(X));
  assert.equal(esc(`"'&`), "&quot;&#39;&amp;");
});

test("task list escapes title, repo, branch, stage", () => {
  const run = { id: X, title: X, repo: X, branch: X, status: "waiting", stage: X, updated_at: "2026-01-01T00:00:00Z" };
  clean(renderTaskList([run]));
  assert.match(renderTaskList([]), /Needs you <span class="count">0/);
});

test("composer escapes chip values", () => {
  const html = renderComposer({ repo: X, mode: "build", queue: [] }, { repos: [X], branches: [X], agents: [X], runners: [X] }, false);
  clean(html);
  assert.match(html, /disabled/);
});

test("stage blocks escape name, summary, steps, detail", () => {
  clean(renderStageBlocks([{ name: X, state: X, summary: X, duration: X, open: true, steps: [{ text: X, detail: X }] }]));
});

test("settings escapes keys and values", () => {
  clean(renderSettings({ [X]: X }, [X]));
});

test("every file index.html references exists", () => {
  const html = readFileSync("public/index.html", "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((r) => !/^(https?:|#)/.test(r));
  assert.ok(refs.length >= 2);
  for (const r of refs) assert.ok(existsSync(path.join("public", r)), r);
  for (const f of ["app.js", "view-home.js", "view-run.js", "styles.css"]) assert.ok(existsSync(path.join("public", f)), f);
});

test("server serves index.html at / and modules, rejects traversal", async () => {
  const s = createServer().listen(0);
  const base = `http://127.0.0.1:${s.address().port}`;
  try {
    const r = await fetch(`${base}/`);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), readFileSync("public/index.html", "utf8"));
    assert.equal((await fetch(`${base}/src/routes.js`)).status, 200);
    assert.equal((await fetch(`${base}/..%2Fpackage.json`)).status, 404);
    assert.equal((await fetch(`${base}/nope.js`)).status, 404);
  } finally { s.close(); }
});
