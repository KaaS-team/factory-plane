// Settings panel: lists the config keys the existing routes expose
// (src/routes.js REDIRECTS and src/palette.js PAGES). Read-only.
import { esc } from "./html.js";

export function renderSettings(redirects, pages) {
  const redirectRows = Object.entries(redirects).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  const pageRows = pages.map((p) => `<li><a href="#/${esc(p)}">${esc(p)}</a></li>`).join("");
  return `<h2 id="settings-title">Settings</h2><h3>Route redirects</h3><table><tbody>${redirectRows}</tbody></table>` +
    `<h3>Pages</h3><ul>${pageRows}</ul>`;
}
