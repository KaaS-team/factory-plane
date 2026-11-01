// Run view renderer: stage blocks from stage-blocks.js output. Data in, HTML string out.
import { esc } from "./html.js";

export function renderStageBlocks(blocks) {
  return `<ol class="stages">` + blocks.map((b) => {
    const steps = b.steps.map((s) => `<li>${esc(s.text)}${s.detail ? `<pre>${esc(s.detail)}</pre>` : ""}</li>`).join("");
    return `<li class="stage stage-${esc(b.state)}"><details${b.open ? " open" : ""}><summary><strong>${esc(b.name)}</strong> ` +
      `<span class="summary">${esc(b.summary)}</span> <span class="dur">${esc(b.duration)}</span></summary><ul>${steps}</ul></details></li>`;
  }).join("") + `</ol>`;
}
