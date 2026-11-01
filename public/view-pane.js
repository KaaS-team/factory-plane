// Right pane renderers: five tabs, risk line, file tree with diff, checks, preview pairs, cost.
// Data in, HTML string out. No DOM.
import { esc } from "./html.js";
import { paneTabs, riskLine, fileTree } from "../src/pane.js";
import { diffLines } from "../src/line-comments.js";
import { previewShots } from "../src/preview.js";

export function renderTabs(active, me) {
  return `<div role="tablist" aria-label="Review pane">` + paneTabs(me).map(([id, label]) =>
    `<button type="button" role="tab" class="tab" data-tab="${esc(id)}" aria-selected="${id === active}">${esc(label)}</button>`).join("") + `</div>`;
}

export function renderOutcome(run) {
  const risk = riskLine(run.risk);
  const items = (run.acceptance ?? []).map((a) => `<li>${a.done ? "Done" : "Open"}: ${esc(a.text)}</li>`).join("");
  return (risk ? `<p class="risk">${esc(risk)}</p>` : "") + `<ul class="acceptance">${items}</ul>`;
}

export function renderChanges(run) {
  const files = run.files ?? [];
  const tree = fileTree(files).map((f) => `<li>${esc(f.label)}</li>`).join("");
  const diffs = files.map((f) => `<section class="diff" aria-label="${esc(f.path)}"><h3>${esc(f.path)}</h3><pre>` +
    diffLines(f.path, f.patch).map((l) => l.line === null
      ? `<span class="dl dl-${l.kind}">${esc(l.text)}</span>\n`
      : `<button type="button" class="dl dl-${l.kind}" data-file="${esc(l.file)}" data-line="${l.line}" data-text="${esc(l.text)}">${esc(l.text)}</button>\n`).join("") +
    `</pre></section>`).join("");
  return `<ul class="tree" aria-label="Changed files">${tree}</ul>${diffs}`;
}

export function renderChecks(run) {
  return `<ul class="checks">` + (run.checks ?? []).map((c) => `<li>${esc(c.name)}: ${esc(c.status)}</li>`).join("") + `</ul>`;
}

export function renderPreview(run) {
  const shots = previewShots(run.repo, run.screenshots ?? []);
  if (shots.length === 0) return `<p class="empty">No screenshots for this run.</p>`;
  const img = (url, alt) => `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`;
  return shots.map((s) => `<figure class="pair">` +
    (s.newScreen ? `<p class="empty">new screen</p>` : img(s.before, `Before: ${s.alt}`)) +
    (s.after ? img(s.after, `After: ${s.alt}`) : "") +
    `<figcaption>${esc(s.alt)}</figcaption></figure>`).join("");
}

// Operator only; tokens, never money.
export function renderCost(run) {
  const c = run.cost ?? {};
  return `<p>Tokens: ${esc(c.tokens ?? 0)}</p>`;
}

const BODIES = { outcome: renderOutcome, changes: renderChanges, checks: renderChecks, preview: renderPreview, cost: renderCost };

export function renderPane(run, tab, me) {
  const ids = paneTabs(me).map((t) => t[0]);
  const active = ids.includes(tab) ? tab : ids[0];
  return renderTabs(active, me) + `<div role="tabpanel" class="panel">${BODIES[active](run)}</div>`;
}

// Pending line comments as chips above the composer input, each with a remove button.
export function renderBatch(items) {
  return items.map((c, i) => `<span class="chip batch">${esc(c.file)}:${esc(c.line)} ` +
    `<button type="button" data-remove="${i}" aria-label="Remove comment on ${esc(c.file)} line ${esc(c.line)}">Remove</button></span>`).join("");
}
