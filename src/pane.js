// Right pane tabs (issue #2, T1). Five tabs; Risk folded into Outcome.
export const PANE_TABS = [
  ["outcome", "Outcome"],
  ["changes", "Changes"],
  ["checks", "Checks"],
  ["preview", "Preview"],
  ["cost", "Cost"],
];

export const isOperator = (me) => Boolean(me) && me.role === "operator";

export const paneTabs = (me) => PANE_TABS.filter(([id]) => id !== "cost" || isOperator(me));

// One line (level and reason) shown above the acceptance checklist.
export function riskLine(risk) {
  if (!risk || !risk.level) return "";
  return risk.reason ? `Risk: ${risk.level}. ${risk.reason}` : `Risk: ${risk.level}`;
}

// File tree rows with +N -M per file, sorted by path.
export function fileTree(files = []) {
  return files
    .map((f) => ({ path: f.path, added: f.added | 0, removed: f.removed | 0 }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((f) => ({ ...f, label: `${f.path} +${f.added} −${f.removed}` }));
}
