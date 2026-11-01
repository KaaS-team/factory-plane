# Cockpit audit: issues #1 and #2 against main (6739d9d)

Gate: `npm run check` (node --check on listed files, then `node --test test/*.test.js`). `npm ci` fails because the repo has no package-lock.json and no dependencies; the gate does not need it.
WIRED means reachable from `public/app.js` (served page) and not only from a test. Paths differ from the issue text: the repo is flat (`src/` for logic, `public/` for views), so `public/lib/*` in the issues maps to `src/*` and `public/view-*.js`.

## Issue #1 (E8.1)

| Task | Criterion | Wired | Proving test | Verdict |
|---|---|---|---|---|
| T1.1 | Three regions, no nav rail | WIRED (index.html) | cockpit-home.test.js "shell: three regions, no nav rail" | met |
| T1.1 | Workflows, Analytics, Fleet, Settings behind gear menu | WIRED | audit-fixes.test.js "gear menu lists every page as a link" | met after fix (entries were plain text, not links) |
| T1.2, T1.3 | Old hashes redirect, exact redirect line, replace not push | WIRED (drawRoute uses location.replace) | cockpit-shell.test.js "old page hashes redirect"; cockpit-home.test.js "shell: each redirect target resolves" | met |
| T1.4 | home default with large composer and Needs you cards | WIRED (renderHome) | cockpit-home.test.js | met |
| T1.5 | rail.js shrinks to list header | no rail.js exists; header, search, gear, repo switcher are in index.html and view-home.js | cockpit-home.test.js (search, repo switch) | met in substance |
| T2.1, T2.3 | groupRuns, taskRow two lines, rowShape exact line | WIRED (renderTaskList) | cockpit-home.test.js "rows: every fixture row..."; cockpit-shell.test.js "rows group..." | met |
| T2.2 | Group headers with counts, no spend figure | WIRED | same tests | met |
| T2.4 | List reads `client.runs.list()`, repo switcher filters | switcher WIRED; data comes from `GET /api/runs`, which this repo's static server does not serve | cockpit-home.test.js | partial: no protocol client or data route in this repo (NG-4) |
| T3.1 | stageBlocks header summaries per stage | WIRED (drawRun) | cockpit-home.test.js "stage blocks: header summaries" | met |
| T3.2 | Collapsed by default, steps on expand, full text one more expand, exact default line | WIRED (toggle and data-full handlers) | cockpit-shell.test.js "stage blocks start collapsed..."; cockpit-home.test.js "stage blocks: collapsed html has no steps..." | met |
| T3.3 | Hairlines via `--line`, no shadows or cards | WIRED (styles.css, no box-shadow) | cockpit-ui.test.js "design rules" | met |
| T3.4 | view-run renders stage strip, then blocks, then pinned composer | blocks and composer WIRED; there is no separate strip | none for the strip | partial: not changed here, the stage list is the only strip |
| T4.1 | Chips for repo, branch, agent, runner; Ask or Build switch | WIRED | cockpit-shell.test.js "composer gates send..."; cockpit-home.test.js "composer: chips..." | partial: branch, agent and runner chips are always built with empty option lists (app.js passes `[]`), only repo has values |
| T4.1 | Ask posts factory:ask, Build files a ready task | composer.send WIRED, but app.js passes no `onSend`, so nothing is posted | cockpit-shell.test.js "composer gates send..." (task kind only) | partial: no create route to post to |
| T4.2 | Send disabled with more than one repo until picked | WIRED | cockpit-shell.test.js; public.test.js | met |
| T4.3 | Enter sends a steer; queued messages with Undo until delivered | Enter, queue, Undo WIRED; `delivered()` is never called and nothing sends the steer | line-comment-steer.test.js (Undo restores) | partial: Undo works, delivery does not exist |
| T4.4 | view-home large composer and cards | WIRED | cockpit-home.test.js | met |

## Issue #2 (E8.2)

| Task | Criterion | Wired | Proving test | Verdict |
|---|---|---|---|---|
| T1.1, T1.2 | Five tabs, Risk folded into Outcome, Cost operator only | WIRED | cockpit-ui.test.js "pane: viewer sees four tabs..."; cockpit.test.js "viewer sees four tabs..." | met after fix (app.js never redrew the pane once `/api/me` returned, so an operator did not see Cost until navigating) |
| T1.3 | Pane 360px at 1440, five tabs fit, file tree with +N −M | WIRED | browser.test.js "1440: an operator's five pane tabs fit on one row"; file tree in cockpit-ui.test.js | met after fix (tabs wrapped onto two rows) |
| T2 | Line click adds `{file, line, text}` to a batch; chips with remove; `path:line` prefix; Undo restores | WIRED (pane and view click handlers, renderBatch). The quote line lives in `src/line-comments.js`, not composer.js | line-comment-steer.test.js (three tests); cockpit-ui.test.js "comments: chips..." | met |
| T3 | Before and after images, foreign URL dropped, "new screen", lazy, alt text, side by side wide and stacked narrow | WIRED (renderPreview, flex row from 1200px) | cockpit-ui.test.js "preview: ..." (two tests) | met for this repo; `pane.ts` named in the issue is not in this repo, images come from `run.screenshots` |
| T4.1 | COMMANDS cover pages and actions | pages WIRED; Switch repo and Open the PR were ORPHAN (act() ignored them) | audit-fixes.test.js "every non-page palette command does something", "open-pr opens only an https url", "switch-repo goes home..." | met after fix |
| T4.2 | Cmd or Ctrl+K, Escape restores focus, `a` gated on awaiting approval | WIRED | cockpit-ui.test.js "palette: ..." (three tests) | met |
| T4.3 | Every page reachable | WIRED | cockpit-ui.test.js "every page command routes to a view or a redirect" | met; Workflows, Analytics and Fleet open a placeholder, no data API serves them |
| T5.1, T5.2 | Under 600px: segmented control, New task, no bottom tab bar, task full screen with Steps, Changes, Outcome | WIRED | cockpit-ui.test.js "phone: ..." (two tests); screenshots below | met |
| T5.3 | Bottom sheet with Approve plan, Request changes, then Plan approved | sheet WIRED. Request changes was a no-op on a phone (the composer is display:none under 600px and the handler only focused it) | browser.test.js "390: Request changes shows the composer"; audit-fixes.test.js "Request changes and New task reveal the composer" | met after fix. Approve posts to `/api/runs/:id/approve`, which no server here provides |
| T5.4 | Old bottom-tabs assertion replaced | WIRED | cockpit-ui.test.js "phone: no bottom tab bar markup or css" | met |

## Fixes in this branch and proof each test fails without its fix

Each was checked by reverting the fix and running the new tests.
1. `public/view-settings.js`: pages are links. Reverted: "gear menu lists every page as a link" fails.
2. `public/keys.js` `actionEffect` and `public/app.js` `act()`: Request changes and New task reveal the composer; Switch repo and Open the PR work. Reverted (public/ restored to main): audit-fixes.test.js fails to load (no `actionEffect`) and "390: Request changes shows the composer" fails.
3. `public/app.js` `load()`: redraws the pane after `/api/me`. Reverted alone: "1440: an operator's five pane tabs" fails (4 tabs, not 5).
4. `public/styles.css`: tab padding and size so five tabs fit in 360px. Reverted alone: the same browser test fails (tabs wrap).

## Browser run

Playwright with Chromium was available. `docs/audit-shots/shoot.mjs` serves the repo with `src/server.js`, mocks `/api/*` with three runs, and writes `docs/audit-shots/home-390.png`, `run-390.png`, `home-1440.png`, `run-1440.png`. The role in the shots is viewer, so Cost is absent (four tabs).
- 390px home: header, search, repo select, segmented control (Needs you 1, Running 1, Done 1), the Needs you row, New task button at the foot. No bottom tab bar. No horizontal scroll (scrollWidth 390). One flaw seen and not fixed: under the segmented control the list still prints all three group headers, so it reads "Running 0, Done 0" next to a count of 1.
- 390px run: Back link, Steps, Changes, Outcome tabs, collapsed stage blocks, sheet with Approve plan and Request changes at the foot.
- 1440px: three panes, 280px list, centre with collapsed stage blocks and composer, 360px pane. Pane tabs fit on one row after the fix.
- Not checked in a browser: dark theme, the preview images (no real asset URLs), diff line clicks, the Cmd+K dialog.

## Remaining

- No data or action routes: `/api/runs`, `/api/runs/:id`, `/api/me`, approve, steer and task creation are not served by this repo. Steers are queued and never delivered, Send on home files nothing, Approve fails with a visible message.
- Branch, agent and runner chips have no option source.
- No separate stage strip on the run page.
- Segment-filtered phone list shows zero-count headers for the other groups.
- No gitleaks scan: the binary is not installed here and was not downloaded.
