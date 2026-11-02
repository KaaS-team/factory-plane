import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { httpsUrl, ownAssetUrl } from "../src/safe-url.js";

test("httpsUrl accepts plain https", () => {
  assert.equal(httpsUrl("https://github.com/o/r/pull/1"), "https://github.com/o/r/pull/1");
});

test("httpsUrl rejects unsafe values", () => {
  for (const v of ["http://github.com/x", "javascript:alert(1)", "https://github.com@other.example/x", "https:///x", "", undefined, null, 5]) {
    assert.equal(httpsUrl(v), null, String(v));
  }
});

const base = "https://raw.githubusercontent.com";
test("ownAssetUrl accepts the repo asset folder", () => {
  assert.ok(ownAssetUrl("o/r", `${base}/o/r/factory/assets/a.png`));
});

test("ownAssetUrl rejects climbing, other repo, other host, http", () => {
  for (const v of [
    `${base}/o/r/factory/assets/../../x/y.png`,
    `${base}/o/r/factory/assets/%2e%2e/%2e%2e/x/y.png`,
    `${base}/o/other/factory/assets/a.png`,
    "https://example.com/o/r/factory/assets/a.png",
    `http://raw.githubusercontent.com/o/r/factory/assets/a.png`,
  ]) {
    assert.equal(ownAssetUrl("o/r", v), null, v);
  }
});

test("keys.js and preview.js import from safe-url.js", () => {
  for (const f of ["public/keys.js", "src/preview.js"]) {
    assert.match(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), /from "(\.\.|\.)\/(src\/)?safe-url\.js"/, f);
  }
});
