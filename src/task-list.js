// Task rows grouped Needs you, Running, Done (issue #1, T2). No rendering.
// run shape: { id, title, repo, branch?, status, stage?, diffstat?: {added, removed}, updated_at }

export const WAITING = new Set(["waiting", "parked", "failed"]);
export const ACTIVE = new Set(["running", "queued"]);

export function groupRuns(runs = []) {
  const out = { needs: [], running: [], done: [] };
  for (const r of runs) {
    if (!r) continue;
    if (WAITING.has(r.status)) out.needs.push(r);
    else if (ACTIVE.has(r.status)) out.running.push(r);
    else out.done.push(r);
  }
  return out;
}

export function rowShape(run) {
  return Boolean(run.repo) && Boolean(run.status) && Boolean(run.diffstat || run.stage) && Boolean(run.updated_at);
}

function ageOf(at, now) {
  const s = Math.max(0, Math.floor((now - Date.parse(at)) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Two lines as data: line1 is status and title, line2 is repo, branch, size or stage, age.
// Only these fields are read, so cost and model never reach a row.
export function taskRow(run, now = Date.now()) {
  const size = run.diffstat ? `+${run.diffstat.added | 0} −${run.diffstat.removed | 0}` : run.stage;
  return {
    id: run.id,
    line1: { status: run.status, title: run.title ?? "" },
    line2: { repo: run.repo, branch: run.branch ?? "", size, age: ageOf(run.updated_at, now) },
  };
}

export function filterByRepo(runs, repo) {
  return repo ? runs.filter((r) => r.repo === repo) : runs;
}
