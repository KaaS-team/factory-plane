// Browser entry. Wires the pure renderers to the DOM. Only runs in a browser.
import { routeFromHash, REDIRECTS } from "../src/routes.js";
import { PAGES } from "../src/palette.js";
import { createComposer } from "../src/composer.js";
import { stageBlocks } from "../src/stage-blocks.js";
import { renderTaskList, renderComposer } from "./view-home.js";
import { renderStageBlocks } from "./view-run.js";
import { renderSettings } from "./view-settings.js";

const $ = (id) => document.getElementById(id);
const composer = createComposer({ repos: [], branches: [], agents: [], runners: [] });
let runs = [];

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function drawComposer() {
  $("composer").innerHTML = renderComposer(composer.state, {}, composer.canSend($("composer").querySelector("textarea")?.value));
}

async function drawRoute() {
  const route = routeFromHash(location.hash);
  if (route.view === "redirect") { location.replace(`#/${route.redirect}`); return; }
  const view = $("view");
  if (route.view === "run") {
    try {
      const run = await getJSON(`/api/runs/${encodeURIComponent(route.jobID)}`);
      view.innerHTML = renderStageBlocks(stageBlocks(run, run.stages ?? [], run.events ?? []));
    } catch { view.textContent = "Run data is unavailable: no API serves it yet."; }
  } else {
    view.textContent = "Select a task.";
  }
}

async function load() {
  try { runs = await getJSON("/api/runs"); } catch { runs = []; }
  $("list").innerHTML = renderTaskList(runs);
  if (runs.length === 0) $("list").insertAdjacentHTML("beforeend", `<p class="empty">No tasks. The data API is not built yet.</p>`);
}

$("gear").addEventListener("click", () => {
  const panel = $("settings");
  const open = panel.hidden;
  panel.hidden = !open;
  $("gear").setAttribute("aria-expanded", String(open));
  if (open) panel.innerHTML = renderSettings(REDIRECTS, PAGES);
});
$("composer").addEventListener("change", (e) => {
  const { name, value } = e.target;
  if (name === "mode") composer.setMode(value); else if (name) composer.pick(name, value);
  drawComposer();
});
$("composer").addEventListener("input", drawComposer);
window.addEventListener("hashchange", drawRoute);
drawComposer();
drawRoute();
load();
