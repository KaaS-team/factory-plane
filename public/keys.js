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

// What an action name does in the page: { compose, focus, go, openUrl }. DOM-free.
// compose reveals the composer (hidden under 600px until asked for).
export function actionEffect(name, run) {
  if (name === "new-task" || name === "request-changes") return { compose: true, focus: "#composer-form textarea" };
  if (name === "switch-repo") return { go: "#/home", focus: "#repo-switch" };
  if (name === "open-pr") {
    const url = run?.pr?.url;
    return typeof url === "string" && url.startsWith("https://") ? { openUrl: url } : null;
  }
  return null;
}
