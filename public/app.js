// Browser entry. Wires the pure renderers to the DOM. Only runs in a browser.
import { routeFromHash, REDIRECTS } from "../src/routes.js";
import { PAGES, COMMANDS, match, createPalette } from "../src/palette.js";
import { createComposer } from "../src/composer.js";
import { createBatch } from "../src/line-comments.js";
import { stageBlocks } from "../src/stage-blocks.js";
import { groupRuns } from "../src/task-list.js";
import { isPhone, SEGMENTS } from "../src/phone.js";
import { renderTaskList, renderComposer } from "./view-home.js";
import { renderStageBlocks } from "./view-run.js";
import { renderSettings } from "./view-settings.js";
import { renderPane, renderBatch } from "./view-pane.js";
import { renderPalette, renderSegments, renderPhoneTabs, renderSheet } from "./view-palette.js";
import { keyAction, commandAction } from "./keys.js";

const $ = (id) => document.getElementById(id);
const composer = createComposer({ repos: [], branches: [], agents: [], runners: [] });
const batch = createBatch();
const palette = createPalette(() => document.activeElement);
let runs = [];
let current = null;
let me = null;
let paneTab = "outcome";
let phoneTab = "Steps";
let segment = SEGMENTS[0];
let approved = false;
let results = COMMANDS;
let active = 0;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const phone = () => isPhone(window.innerWidth);

function drawComposer() {
  $("composer-form").innerHTML = renderComposer(composer.state, {}, composer.canSend($("composer-form").querySelector("textarea")?.value));
  $("batch").innerHTML = renderBatch(batch.items);
}

function drawPane() {
  const pane = $("pane");
  pane.hidden = !current;
  if (current) pane.innerHTML = renderPane(current, paneTab, me);
}

function drawSheet() {
  const show = phone() && current;
  $("sheet").hidden = !show;
  if (show) $("sheet").innerHTML = renderSheet({ awaiting: current.status === "awaiting_approval", approved });
}

function drawList() {
  const g = groupRuns(runs);
  const keys = { "Needs you": "needs", "Running": "running", "Done": "done" };
  const counts = Object.fromEntries(SEGMENTS.map((s) => [s, g[keys[s]].length]));
  $("segments").innerHTML = renderSegments(segment, counts);
  const shown = phone() ? g[keys[segment]] : runs;
  $("list").innerHTML = renderTaskList(shown);
  if (runs.length === 0) $("list").insertAdjacentHTML("beforeend", `<p class="empty">No tasks. The data API is not built yet.</p>`);
}

function drawRun() {
  const view = $("view");
  const blocks = renderStageBlocks(stageBlocks(current, current.stages ?? [], current.events ?? []));
  if (!phone()) { view.innerHTML = blocks; return; }
  const body = phoneTab === "Steps" ? blocks
    : renderPane(current, phoneTab.toLowerCase(), me);
  view.innerHTML = `<a href="#/home" class="back">Back to tasks</a>${renderPhoneTabs(phoneTab)}${body}`;
}

async function drawRoute() {
  const route = routeFromHash(location.hash);
  if (route.view === "redirect") { location.replace(`#/${route.redirect}`); return; }
  const view = $("view");
  document.body.dataset.screen = route.view === "home" && phone() ? "list" : (phone() ? "task" : "wide");
  current = null;
  if (route.view === "run") {
    try {
      current = await getJSON(`/api/runs/${encodeURIComponent(route.jobID)}`);
      approved = false;
      drawRun();
    } catch { view.textContent = "Run data is unavailable: no API serves it yet."; }
  } else if (route.view === "settings") {
    view.innerHTML = renderSettings(REDIRECTS, PAGES);
  } else if (PAGES.includes(route.view)) {
    view.innerHTML = `<h2>${route.view}</h2><p class="empty">No data API serves this page yet.</p>`;
  } else {
    view.textContent = "Select a task.";
  }
  drawPane();
  drawSheet();
}

async function approve() {
  if (!current || current.status !== "awaiting_approval") return;
  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(current.id)}/approve`, { method: "POST" });
    if (!res.ok) throw new Error(String(res.status));
    approved = true;
  } catch { $("view").insertAdjacentHTML("afterbegin", `<p role="alert">Approval failed: no API serves it yet.</p>`); }
  drawSheet();
}

function act(name) {
  if (name === "approve") approve();
  else if (name === "new-task") { document.body.classList.add("compose"); $("composer-form").querySelector("textarea")?.focus(); }
  else if (name === "request-changes") $("composer-form").querySelector("textarea")?.focus();
}

function drawPalette() {
  $("palette-list").innerHTML = renderPalette(results, active);
}
function openPalette() {
  palette.show();
  results = COMMANDS; active = 0;
  $("palette-input").value = "";
  drawPalette();
  $("palette").showModal();
  $("palette-input").focus();
}
function closePalette() {
  const back = palette.close();
  if ($("palette").open) $("palette").close();
  back?.focus?.();
}
function choose(id) {
  const cmd = COMMANDS.find((c) => c.id === id);
  closePalette();
  const r = commandAction(cmd, current);
  if (r?.go) location.hash = r.go; else if (r?.act) act(r.act);
}

async function load() {
  try { runs = await getJSON("/api/runs"); } catch { runs = []; }
  try { me = await getJSON("/api/me"); } catch { me = null; }
  drawList();
}

document.addEventListener("keydown", (e) => {
  const a = keyAction(e, { paletteOpen: palette.open, run: current });
  if (a === "open-palette") { e.preventDefault(); openPalette(); }
  else if (a === "close-palette") { e.preventDefault(); closePalette(); }
  else if (a === "approve") act("approve");
  else if (palette.open && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
    e.preventDefault();
    if (e.key === "Enter") choose(results[active]?.id);
    else { active = (active + (e.key === "ArrowDown" ? 1 : results.length - 1)) % Math.max(results.length, 1); drawPalette(); }
  }
});
$("palette").addEventListener("cancel", (e) => { e.preventDefault(); closePalette(); });
$("palette-input").addEventListener("input", (e) => { results = match(e.target.value); active = 0; drawPalette(); });
$("palette-list").addEventListener("click", (e) => { const li = e.target.closest("[data-cmd]"); if (li) choose(li.dataset.cmd); });
$("gear").addEventListener("click", () => {
  const panel = $("settings");
  const open = panel.hidden;
  panel.hidden = !open;
  $("gear").setAttribute("aria-expanded", String(open));
  if (open) panel.innerHTML = renderSettings(REDIRECTS, PAGES);
});
$("newtask").addEventListener("click", () => act("new-task"));
$("segments").addEventListener("click", (e) => { const b = e.target.closest("[data-segment]"); if (b) { segment = b.dataset.segment; drawList(); } });
$("view").addEventListener("click", (e) => {
  const t = e.target.closest("[data-ptab]");
  if (t) { phoneTab = t.dataset.ptab; drawRun(); }
  const d = e.target.closest("[data-file]");
  if (d) { batch.add(d.dataset.file, Number(d.dataset.line), d.dataset.text); drawComposer(); }
  const tab = e.target.closest("[data-tab]");
  if (tab) { paneTab = tab.dataset.tab; drawRun(); }
});
$("pane").addEventListener("click", (e) => {
  const tab = e.target.closest("[data-tab]");
  if (tab) { paneTab = tab.dataset.tab; drawPane(); }
  const d = e.target.closest("[data-file]");
  if (d) { batch.add(d.dataset.file, Number(d.dataset.line), d.dataset.text); drawComposer(); }
});
$("sheet").addEventListener("click", (e) => { const b = e.target.closest("[data-action]"); if (b) act(b.dataset.action); });
$("batch").addEventListener("click", (e) => {
  const b = e.target.closest("[data-remove]");
  if (b) { batch.remove(Number(b.dataset.remove)); drawComposer(); }
});
$("composer-form").addEventListener("change", (e) => {
  const { name, value } = e.target;
  if (name === "mode") composer.setMode(value); else if (name && name !== "text") composer.pick(name, value);
  drawComposer();
});
$("composer-form").addEventListener("input", (e) => {
  const text = e.target.value;
  const keep = e.target.selectionStart;
  drawComposer();
  const ta = $("composer-form").querySelector("textarea");
  ta.value = text; ta.focus(); ta.setSelectionRange(keep, keep);
  $("composer-form").querySelector("button[type=submit]").disabled = !composer.canSend(text);
});
$("composer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const ta = e.target.querySelector("textarea");
  if (!composer.canSend(ta.value)) return;
  const message = batch.send(ta.value);
  composer.send(message);
  drawComposer();
});
window.addEventListener("hashchange", drawRoute);
window.addEventListener("resize", () => { drawList(); drawSheet(); });
drawComposer();
drawRoute();
load();
