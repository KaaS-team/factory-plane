// Preview image pairs (issue #2, T3). Only the repo's own factory/assets raw
// URLs render; anything else is dropped.
export function previewShots(repo, shots = []) {
  const ours = (url) => typeof url === "string" && url.startsWith(`https://raw.githubusercontent.com/${repo}/factory/assets/`);
  return shots.map((s) => {
    const alt = `${s.state} ${s.viewport} ${s.theme}`;
    const before = ours(s.before) ? s.before : null;
    const after = ours(s.after) ? s.after : null;
    return { alt, before, after, newScreen: before === null, lazy: true };
  });
}
