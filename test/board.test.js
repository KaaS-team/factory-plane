import test from "node:test";
import assert from "node:assert/strict";
import { deriveColumns, stageBlocks, buildBoard } from "../src/board.js";

const wfA = { stages: [{ id: "plan" }, { id: "build", name: "Build" }, { id: "review", gate: true }] };
const wfB = { stages: [{ id: "triage" }, { id: "ship", gate: true }] };

test("columns follow the workflow, not a fixed enum", () => {
  assert.deepEqual(deriveColumns(wfA).map((c) => c.id), ["plan", "build", "review"]);
  assert.deepEqual(deriveColumns(wfB).map((c) => c.id), ["triage", "ship"]);
  assert.equal(deriveColumns(wfA)[1].title, "Build");
  assert.equal(deriveColumns(wfA)[0].title, "plan");
  assert.equal(deriveColumns(wfA)[2].gate, true);
});

test("duplicate, invalid or missing stages are skipped", () => {
  assert.deepEqual(deriveColumns({ stages: [{ id: "a" }, { id: "a" }, {}, null] }).map((c) => c.id), ["a"]);
  assert.deepEqual(deriveColumns(null), []);
});

test("stage blocks count runs per stage", () => {
  const runs = [{ id: 1, stage: "build" }, { id: 2, stage: "build" }, { id: 3, stage: "plan" }];
  assert.deepEqual(stageBlocks(wfA, runs).map((b) => b.count), [1, 2, 0]);
});

test("board places runs and keeps unknown-stage runs as unplaced", () => {
  const runs = [{ id: 1, stage: "ship" }, { id: 2, stage: "gone" }];
  const b = buildBoard(wfB, runs);
  assert.equal(b.columns[1].runs[0].id, 1);
  assert.equal(b.unplaced[0].id, 2);
});
