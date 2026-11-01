// Command palette (issue #2, T4). Pure ranking and gating; no DOM.
export const PAGES = ["runs", "workflows", "analytics", "fleet", "settings"];

export const COMMANDS = [
  ...PAGES.map((p) => ({ id: `page:${p}`, title: `Open ${p}`, page: p })),
  { id: "switch-repo", title: "Switch repo" },
  { id: "approve", title: "Approve plan", needsApproval: true },
  { id: "request-changes", title: "Request changes" },
  { id: "new-task", title: "New task" },
  { id: "open-pr", title: "Open the PR" },
];

// Rank by word-prefix: a query word must prefix some title word. Earlier
// matching words rank higher; non-matches are dropped.
export function match(query, commands = COMMANDS) {
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands.slice();
  const scored = [];
  for (const c of commands) {
    const tw = c.title.toLowerCase().split(/\s+/);
    let score = 0;
    let ok = true;
    for (const w of words) {
      const at = tw.findIndex((t) => t.startsWith(w));
      if (at < 0) { ok = false; break; }
      score += at;
    }
    if (ok) scored.push({ c, score });
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.c);
}

// The `a` shortcut approves only when the selected run awaits approval.
export const canApprove = (run) => Boolean(run) && run.status === "awaiting_approval";
export const shortcutAction = (key, run) => (key === "a" && canApprove(run) ? "approve" : null);
export const isPaletteKey = (e) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";

// Focus restore: open remembers the active element, close returns it.
export function createPalette(activeElement) {
  let open = false;
  let saved = null;
  return {
    get open() { return open; },
    show() { open = true; saved = activeElement(); },
    close() { open = false; return saved; },
  };
}
