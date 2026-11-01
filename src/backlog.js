// Backlog columns for the board (issue #3, T1).
// Folds workflow stages into six fixed backlog columns, flags parked work in
// place with needsYou, and fills done from recently shipped runs.
//
// run shape: { id, stage, parkedLabel?, shippedAt? } where shippedAt is a
// timestamp (ms or ISO string) and parkedLabel is a string or null.

export const BACKLOG_COLUMNS = ["intake", "triage", "plan", "build", "review", "done"];
export const DONE_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_STAGES = new Set(["verify", "pr"]);

// Where a workflow stage sits on the backlog board. Stages named after a
// backlog column map to it; verify and pr, and any custom step from verify
// onward, are review; any other custom step before verify is build.
export function columnForStage(stage, workflow) {
  if (BACKLOG_COLUMNS.includes(stage)) return stage;
  if (REVIEW_STAGES.has(stage)) return "review";
  const ids = (workflow && Array.isArray(workflow.stages) ? workflow.stages : []).map((s) => s && s.id);
  const at = ids.indexOf(stage);
  const verifyAt = ids.indexOf("verify");
  if (at >= 0 && verifyAt >= 0 && at > verifyAt) return "review";
  return "build";
}

function toMs(t) {
  const n = typeof t === "number" ? t : Date.parse(t);
  return Number.isFinite(n) ? n : null;
}

export function isRecentlyShipped(run, now = Date.now()) {
  const at = toMs(run && run.shippedAt);
  return at !== null && at <= now && now - at <= DONE_WINDOW_DAYS * DAY_MS;
}

export function buildBacklog(workflow, runs = [], now = Date.now()) {
  const columns = BACKLOG_COLUMNS.map((id) => ({ id, runs: [] }));
  const byId = new Map(columns.map((c) => [c.id, c]));
  for (const r of runs) {
    if (!r) continue;
    const parkedLabel = r.parkedLabel ?? null;
    const needsYou = parkedLabel !== null;
    // A parked run keeps its stage column and is never done.
    const id = !needsYou && isRecentlyShipped(r, now) ? "done" : columnForStage(r.stage, workflow);
    byId.get(id).runs.push({ ...r, needsYou, badge: needsYou ? parkedLabel : null });
  }
  return columns;
}
