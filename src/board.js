// Board columns and stage blocks derived from the resolved workflow (issue #6).
// There is no fixed status enum: the columns are exactly the stages of the
// workflow a team resolved, in that order.
//
// resolved workflow shape: { stages: [{ id, name?, gate? }] }
// run shape: { id, stage, ... }

export function deriveColumns(workflow) {
  const stages = workflow && Array.isArray(workflow.stages) ? workflow.stages : [];
  const seen = new Set();
  const columns = [];
  for (const s of stages) {
    if (!s || typeof s.id !== "string" || s.id === "" || seen.has(s.id)) continue;
    seen.add(s.id);
    columns.push({ id: s.id, title: s.name ?? s.id, gate: Boolean(s.gate) });
  }
  return columns;
}

// A stage block is the column header summary: title, gate marker, run count.
export function stageBlocks(workflow, runs = []) {
  return deriveColumns(workflow).map((c) => ({
    ...c,
    count: runs.filter((r) => r.stage === c.id).length,
  }));
}

// Runs whose stage is not in the workflow land in `unplaced`, never dropped.
export function buildBoard(workflow, runs = []) {
  const columns = deriveColumns(workflow).map((c) => ({ ...c, runs: [] }));
  const byId = new Map(columns.map((c) => [c.id, c]));
  const unplaced = [];
  for (const r of runs) {
    const col = byId.get(r.stage);
    if (col) col.runs.push(r);
    else unplaced.push(r);
  }
  return { columns, unplaced };
}
