import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBatch } from "../src/line-comments.js";
import { createComposer } from "../src/composer.js";

// Mirrors the Enter handler and Undo handler in public/app.js.
function steer(batch, composer, text) {
  const message = batch.send(text.trim());
  return composer.steer(message, batch.sent);
}
function undo(batch, composer, id) {
  batch.restore(composer.peek(id)?.comments);
  composer.undo(id);
}

test("steer: queued message carries two path:line blocks and clears the batch", () => {
  const b = createBatch(), c = createComposer();
  b.add("a.js", 11, "+new"); b.add("b.js", 2, "x");
  const item = steer(b, c, "go");
  assert.equal(item.text, "> a.js:11\n> +new\n\n> b.js:2\n> x\n\ngo");
  assert.equal(b.items.length, 0);
});

test("steer: Undo on the queued message restores the batch", () => {
  const b = createBatch(), c = createComposer();
  b.add("a.js", 11, "+new"); b.add("b.js", 2, "x");
  const item = steer(b, c, "go");
  b.add("c.js", 5, "y");
  undo(b, c, item.id);
  assert.deepEqual(b.items.map((i) => i.file), ["a.js", "b.js", "c.js"]);
  assert.equal(c.state.queue.length, 0);
});

test("steer: app.js uses the batch for steer and Undo, and previews sit side by side at 1440", () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /batch\.send\(/);
  assert.match(app, /batch\.restore\(composer\.peek/);
  const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
  assert.match(css, /min-width: 1200px\) \{\s*\.pair \{ flex-direction:row/);
});
