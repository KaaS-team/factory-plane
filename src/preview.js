// Preview image pairs (issue #2, T3). Only the repo's own factory/assets raw
// URLs render; anything else is dropped.
import { ownAssetUrl } from "./safe-url.js";

export function previewShots(repo, shots = []) {
  return shots.map((s) => {
    const alt = `${s.state} ${s.viewport} ${s.theme}`;
    const before = ownAssetUrl(repo, s.before);
    const after = ownAssetUrl(repo, s.after);
    return { alt, before, after, newScreen: before === null, lazy: true };
  });
}
