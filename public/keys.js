// Keyboard and command mapping. DOM-free: takes plain event-like objects.
import { isPaletteKey, shortcutAction } from "../src/palette.js";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// ctx: { paletteOpen, run }. Returns "open-palette", "close-palette", "approve" or null.
export function keyAction(e, ctx = {}) {
  if (isPaletteKey(e)) return "open-palette";
  if (e.key === "Escape" && ctx.paletteOpen) return "close-palette";
  if (ctx.paletteOpen || TYPING.has(e.target?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return null;
  return shortcutAction(e.key, ctx.run);
}

// What a chosen command does: { go: hash } | { act: name } | null.
export function commandAction(cmd, run) {
  if (!cmd) return null;
  if (cmd.page) return { go: `#/${cmd.page}` };
  if (cmd.needsApproval) return shortcutAction("a", run) ? { act: "approve" } : null;
  return { act: cmd.id };
}
