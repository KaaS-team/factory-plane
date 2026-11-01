// Home view renderers: task list (left pane) and composer (bottom). Data in, HTML string out.
import { esc } from "./html.js";
import { groupRuns, taskRow } from "../src/task-list.js";

const GROUPS = [["needs", "Needs you"], ["running", "Running"], ["done", "Done"]];

export function renderTaskList(runs, now = Date.now()) {
  const g = groupRuns(runs);
  return GROUPS.map(([key, label]) => {
    const rows = g[key].map((run) => {
      const r = taskRow(run, now);
      return `<li><a class="row" href="#/run/${encodeURIComponent(r.id)}">` +
        `<span class="l1"><span class="status status-${esc(r.line1.status)}">${esc(r.line1.status)}</span> <span class="title">${esc(r.line1.title)}</span></span>` +
        `<span class="l2">${esc(r.line2.repo)} · <code>${esc(r.line2.branch)}</code> · ${esc(r.line2.size)} · ${esc(r.line2.age)}</span></a></li>`;
    }).join("");
    return `<section class="group" aria-label="${esc(label)}"><h2>${esc(label)} <span class="count">${g[key].length}</span></h2><ul>${rows}</ul></section>`;
  }).join("");
}

// state is a composer state ({repo, branch, agent, runner, mode, queue}); opts lists chip choices.
export function renderComposer(state, opts = {}, canSend = false) {
  const chip = (name, values) => {
    const options = (values ?? []).map((v) => `<option value="${esc(v)}"${v === state[name] ? " selected" : ""}>${esc(v)}</option>`).join("");
    return `<label class="chip">${esc(name)} <select name="${esc(name)}"><option value=""${state[name] ? "" : " selected"}>pick…</option>${options}</select></label>`;
  };
  return `<form class="composer" aria-label="Composer">` +
    `<textarea name="text" rows="2" aria-label="Message"></textarea>` +
    `<div class="chips">${chip("repo", opts.repos)}${chip("branch", opts.branches)}${chip("agent", opts.agents)}${chip("runner", opts.runners)}` +
    `<label class="chip">mode <select name="mode"><option value="build"${state.mode === "build" ? " selected" : ""}>Build</option><option value="ask"${state.mode === "ask" ? " selected" : ""}>Ask</option></select></label>` +
    `<button type="submit"${canSend ? "" : " disabled"}>Send</button></div></form>`;
}
