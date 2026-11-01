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
