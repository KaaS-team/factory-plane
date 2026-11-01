// Collapsed stage blocks for the run page (issue #1, T3). No rendering.
// stages: [{ name, state, summary?, durationMs? }]; events: [{ stage, text, detail? }]

export function stageBlocks(run, stages = [], events = [], opts = {}) {
  const open = new Set(opts.open ?? []);
  const full = new Set(opts.full ?? []);
  return stages.map((s) => {
    const isOpen = open.has(s.name);
    const steps = isOpen ? events.filter((e) => e.stage === s.name) : [];
    return {
      name: s.name,
      state: s.state,
      summary: s.summary ?? stageSummary(run, s.name),
      duration: formatDuration(s.durationMs),
      open: isOpen,
      steps: steps.map((e) => ({ text: e.text, detail: full.has(s.name) ? (e.detail ?? "") : null })),
    };
  });
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// One-line header summary per stage, read from the run. Plain facts only.
export function stageSummary(run = {}, name) {
  if (name === "triage") {
    const n = (run.files ?? []).length;
    return run.risk?.level ? `${run.risk.level} risk, ${n} ${n === 1 ? "file" : "files"}` : "";
  }
  if (name === "plan") return run.approved_by ? `approved by ${run.approved_by}` : "";
  if (name === "build") {
    const d = run.diffstat ?? (run.files ?? []).reduce((a, f) => ({ added: a.added + (f.added | 0), removed: a.removed + (f.removed | 0) }), { added: 0, removed: 0 });
    return (run.files?.length || run.diffstat) ? `+${d.added | 0} −${d.removed | 0}` : "";
  }
  if (name === "verify") {
    const c = run.checks ?? [];
    return c.length ? `${c.filter((x) => x.status === "pass").length}/${c.length} checks` : "";
  }
  if (name === "pr") return run.pr?.state ?? "";
  return "";
}
