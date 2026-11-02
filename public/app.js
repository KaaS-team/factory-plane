// Browser entry. Wires the pure renderers to the DOM. Only runs in a browser.
import { routeFromHash, homeParams, REDIRECTS } from "../src/routes.js";
import { PAGES, COMMANDS, match, createPalette } from "../src/palette.js";
import { createComposer } from "../src/composer.js";
import { createBatch } from "../src/line-comments.js";
import { stageBlocks } from "../src/stage-blocks.js";
import { groupRuns, searchRuns, filterByRepo, repoList } from "../src/task-list.js";
import { isPhone, SEGMENTS } from "../src/phone.js";
import { renderTaskList, renderComposer, renderHome, renderQueue, renderSearch, renderRepoSwitcher } from "./view-home.js";
import { renderStageBlocks } from "./view-run.js";
import { renderSettings } from "./view-settings.js";
import { renderPane, renderBatch } from "./view-pane.js";
import { renderPalette, renderSegments, renderPhoneTabs, renderSheet } from "./view-palette.js";
import { keyAction, commandAction, actionEffect } from "./keys.js";

const $ = (id) => document.getElementById(id);
let composer = createComposer({ repos: [], branches: [], agents: [], runners: [] });
const batch = createBatch();
const palette = createPalette(() => document.activeElement);
let runs = [];
let current = null;
let me = null;
let paneTab = "outcome";
let phoneTab = "Steps";
let segment = SEGMENTS[0];
let approved = false;
let route = { view: "home" };
let group = "all";
let query = "";
let repoFilter = "";
const openStages = new Set();
const fullStages = new Set();
let results = COMMANDS;
let active = 0;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const phone = () => isPhone(window.innerWidth);

const chipOpts = () => ({ repos: repoList(runs), branches: [], agents: [], runners: [] });
const onHome = () => route.view === "home";
const formText = () => document.querySelector("form.composer textarea")?.value ?? "";

function drawComposer() {
  const text = formText();
  const can = composer.canSend(text);
  if (onHome()) {
    $("composer-form").innerHTML = "";
    $("view").innerHTML = renderHome(composer.state, chipOpts(), can, runs);
  } else {
    $("composer-form").innerHTML = renderQueue(composer.state.queue) + renderComposer(composer.state, chipOpts(), can);
  }
  const ta = document.querySelector("form.composer textarea");
  if (ta && text) ta.value = text;
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
  const scoped = searchRuns(filterByRepo(runs, repoFilter), query);
  $("list").innerHTML = phone()
    ? renderTaskList(scoped, Date.now(), { only: keys[segment] })
    : renderTaskList(group === "all" ? scoped : groupRuns(scoped)[group]);
  $("list-tools").innerHTML = renderSearch(query) + renderRepoSwitcher(repoList(runs), repoFilter);
  if (runs.length === 0) $("list").insertAdjacentHTML("beforeend", `<p class="empty">No tasks. The data API is not built yet.</p>`);
}

function drawRun() {
  const view = $("view");
  const blocks = renderStageBlocks(stageBlocks(current, current.stages ?? [], current.events ?? [], { open: [...openStages], full: [...fullStages] }));
  if (!phone()) { view.innerHTML = blocks; return; }
  const body = phoneTab === "Steps" ? blocks
    : renderPane(current, phoneTab.toLowerCase(), me);
  view.innerHTML = `<a href="#/home" class="back">Back to tasks</a>${renderPhoneTabs(phoneTab)}${body}`;
}

async function drawRoute() {
  route = routeFromHash(location.hash);
  if (route.view === "redirect") { location.replace(`#/${route.redirect}`); return; }
  const view = $("view");
  document.body.dataset.screen = route.view === "home" && phone() ? "list" : (phone() ? "task" : "wide");
  current = null;
  openStages.clear(); fullStages.clear();
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
    group = homeParams(location.hash).group;
    drawList();
    drawComposer();
  }
  if (!onHome()) drawComposer();
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

function focusSoon(sel) { setTimeout(() => document.querySelector(sel)?.focus(), 0); }

function act(name) {
  if (name === "approve") { approve(); return; }
  const fx = actionEffect(name, current);
  if (!fx) return;
  if (fx.compose) document.body.classList.add("compose");
  if (fx.openUrl) window.open(fx.openUrl, "_blank", "noopener");
  if (fx.go && location.hash !== fx.go) {
    window.addEventListener("hashchange", () => focusSoon(fx.focus), { once: true });
    location.hash = fx.go;
  } else if (fx.focus) focusSoon(fx.focus);
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
  composer = createComposer({ repos: repoList(runs), branches: [], agents: [], runners: [] });
  if (onHome()) drawComposer();
  try { me = await getJSON("/api/me"); } catch { me = null; }
  drawList();
  drawPane();
  if (current && phone()) drawRun();
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
document.addEventListener("change", (e) => {
  if (!e.target.closest("form.composer")) return;
  const { name, value } = e.target;
  if (name === "mode") composer.setMode(value); else if (name && name !== "text") composer.pick(name, value);
  drawComposer();
});
document.addEventListener("input", (e) => {
  if (!e.target.closest("form.composer") || e.target.name !== "text") return;
  const btn = e.target.closest("form").querySelector("button[type=submit]");
  btn.disabled = !composer.canSend(e.target.value);
});
// On a task page Enter sends a steer; Shift+Enter adds a line.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey || e.target.name !== "text" || onHome() || !current) return;
  e.preventDefault();
  if (!e.target.value.trim()) return;
  const message = batch.send(e.target.value.trim());
  composer.steer(message, batch.sent);
  e.target.value = "";
  drawComposer();
});
document.addEventListener("submit", (e) => {
  if (!e.target.closest("form.composer")) return;
  e.preventDefault();
  const ta = e.target.querySelector("textarea");
  if (!composer.canSend(ta.value)) return;
  const message = batch.send(ta.value);
  composer.send(message);
  ta.value = "";
  drawComposer();
});
$("composer").addEventListener("click", (e) => {
  const u = e.target.closest("[data-undo]");
  if (u) {
    const id = Number(u.dataset.undo);
    batch.restore(composer.peek(id)?.comments);
    composer.undo(id);
    drawComposer();
  }
});
$("view").addEventListener("toggle", (e) => {
  const name = e.target.dataset?.stage;
  if (!name || !current) return;
  if (e.target.open === openStages.has(name)) return;
  if (e.target.open) openStages.add(name); else openStages.delete(name);
  drawRun();
}, true);
$("view").addEventListener("click", (e) => {
  const f = e.target.closest("[data-full]");
  if (f) { fullStages.add(f.dataset.full); drawRun(); }
});
$("left").addEventListener("input", (e) => { if (e.target.id === "search") { query = e.target.value; drawList(); $("search").focus(); } });
$("left").addEventListener("change", (e) => { if (e.target.id === "repo-switch") { repoFilter = e.target.value; drawList(); } });
window.addEventListener("hashchange", drawRoute);
window.addEventListener("resize", () => { drawList(); drawSheet(); });
drawComposer();
drawRoute();
load();
