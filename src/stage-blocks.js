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
      summary: s.summary ?? "",
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
