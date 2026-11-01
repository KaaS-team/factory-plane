// Hash routing with redirects for retired pages (issue #1, T1).
// Pure logic only: no document, no location.

export const REDIRECTS = {
  line: "home",
  board: "home?group=all",
  runs: "home?group=done",
  events: "settings/events",
  minions: "settings/minions",
};

// "#/line" or "line" -> { view, jobID, redirect? }. Empty hash is home.
export function routeFromHash(hash) {
  const value = String(hash ?? "").replace(/^#\/?/, "").split("/")[0].split("?")[0];
  if (value === "") return { view: "home", jobID: "" };
  if (Object.hasOwn(REDIRECTS, value)) return { view: "redirect", jobID: "", redirect: REDIRECTS[value] };
  return { view: value, jobID: String(hash).replace(/^#\/?/, "").split("/")[1] ?? "" };
}

// "#/home?group=done" -> { group: "done" }. Unknown groups read as "all".
export function homeParams(hash) {
  const q = String(hash ?? "").split("?")[1] ?? "";
  const g = new URLSearchParams(q).get("group");
  return { group: ["needs", "running", "done"].includes(g) ? g : "all" };
}
