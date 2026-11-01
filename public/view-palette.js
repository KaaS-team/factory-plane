// Command palette, phone segments, phone tabs and approval sheet renderers. DOM-free.
import { esc } from "./html.js";
import { SEGMENTS, PHONE_TABS, SHEET_ACTIONS } from "../src/phone.js";

export function renderPalette(results, active = 0) {
  return `<ul role="listbox" aria-label="Commands">` + results.map((c, i) =>
    `<li role="option" id="cmd-${esc(c.id)}" data-cmd="${esc(c.id)}" aria-selected="${i === active}">${esc(c.title)}</li>`).join("") + `</ul>`;
}

export function renderSegments(active, counts = {}) {
  return `<div class="segments" role="tablist" aria-label="Task groups">` + SEGMENTS.map((s) =>
    `<button type="button" role="tab" data-segment="${esc(s)}" aria-selected="${s === active}">${esc(s)} ${esc(counts[s] ?? 0)}</button>`).join("") + `</div>`;
}

export function renderPhoneTabs(active) {
  return `<div class="phone-tabs" role="tablist" aria-label="Task">` + PHONE_TABS.map((t) =>
    `<button type="button" role="tab" data-ptab="${esc(t)}" aria-selected="${t === active}">${esc(t)}</button>`).join("") + `</div>`;
}

// Bottom sheet; the action names match the desktop. After approval it reads "Plan approved".
export function renderSheet({ awaiting = false, approved = false } = {}) {
  const [approve, changes] = SHEET_ACTIONS;
  const first = approved ? `<button type="button" disabled>Plan approved</button>`
    : `<button type="button" data-action="approve"${awaiting ? "" : " disabled"}>${esc(approve)}</button>`;
  return `<div class="sheet" role="group" aria-label="Plan actions">${first}` +
    `<button type="button" data-action="request-changes">${esc(changes)}</button></div>`;
}
