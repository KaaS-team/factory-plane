<!-- factory:planned v1 -->
Repo: KaaS-team/factory-plane
Deps: none
Epic: E8.1 Cockpit shell, rows, stages, composer
Milestone: Phase 8 cockpit PWA
Runner: factory

## Why
The cockpit's job is to answer "what needs me, and is this change safe to merge?" in one glance across many repos. Today it is ten pages behind a nav rail (Inbox, Line, Board, Runs, Workflows, Events, Minions, Analytics, Fleet, Settings), so the answer is spread over Inbox, Line and Runs and a viewer clicks between them. This epic (P1 to P4 of the cockpit design) makes the task list the product: a three-pane shell with the list on the left, old page links redirected into it, two-line rows that say what, where, how big and whether it needs you, collapsed stage blocks in the centre, and a composer with repo, branch, agent and runner chips and an Ask or Build mode.

## Today
Paths below are given at their factory-repo location today; #200 (D7) moves `dashboard/` to this repo's root, so `dashboard/public/app.js` becomes `public/app.js`. Every Files path in this plan is the post-split path.
- `dashboard/public/app.js:22` `VIEWS` maps ten views and `:34` `LOADERS` loads each from its own endpoint; `dashboard/public/index.html:16` renders a sidebar `nav` that `renderNav` fills.
- `dashboard/public/lib/routes.js:2` the page set is `inbox, line, board, runs, workflows, events, minions, analytics, agents, settings`; an unknown hash falls back to `inbox`.
- `dashboard/public/lib/rail.js:25` `NAV` lists nine entries and `:36` `PRIMARY = 4` puts Inbox, Line, Board and Runs on top.
- `dashboard/public/lib/stations.js:4` `STAGES` and `stationStates(run, stages)` already compute each stage's done, live, waiting and failed state for the Line view.
- `dashboard/public/lib/view-line.js:1` the Line view holds "what needs you, each run's stage strip, what just happened, and a composer that files a new task".
- `tests/dashboard-ui.test.ts:224` (factory repo) already pins that with two projects the composer will not submit until a project is picked; the fake-document harness at `:12` renders views without a browser.
- `src/api/routes.ts` (factory, #195) `runs.list` returns runs across repos with the fields a row needs once #196 adds `diffstat` and `branch` to the run schema; this plan reads them through `createClient`, never a factory import.

## Change
### T1: Three-pane shell and nav redirects (P1)
Files: `public/index.html`, `public/app.js`, `public/lib/routes.js`, `public/lib/rail.js`, `public/styles.css`, `tests/shell.test.ts`
Model: sonnet
1. `public/index.html` becomes three regions: `aside#list` (280px), `main#view`, and `aside#pane` (360px); the nav rail markup is removed. Pages (Workflows, Analytics, Fleet, Settings) move behind a gear menu in the list header.
2. In `public/lib/routes.js` add `REDIRECTS = { line: "home", board: "home?group=all", runs: "home?group=done", events: "settings/events", minions: "settings/minions" }` and have `routeFromHash` return `{ view, redirect }` for a redirected hash; `app.js` replaces the hash with `location.replace` so the back button does not loop.
3. The redirect must be written as exactly this line: `if (Object.hasOwn(REDIRECTS, value)) return { view: "redirect", jobID: "", redirect: REDIRECTS[value] };`
4. `home` is the new default view: the composer large, with "Needs you" cards under it.
5. `public/lib/rail.js` shrinks to the list header (search box, gear menu, repo switcher at the foot); `NAV` keeps only the gear menu entries.

### T2: Two-line task rows grouped Needs you, Running, Done (P2)
Files: `public/lib/task-list.js`, `public/lib/rail.js`, `public/styles.css`, `tests/rows.test.ts`
Model: sonnet
Deps: T1
1. Create `public/lib/task-list.js` exporting `groupRuns(runs)` that returns `{ needs, running, done }` using `WAITING` and `ACTIVE` from `stations.js`, and `taskRow(run)` that renders two lines: a status glyph and the title; then repo, branch (Geist Mono), `+N −M` or the current stage when there is no diff yet, and age.
2. Each group header shows its count; there is no separate greeting header or spend figure.
3. `rowShape(run)` returns the four facts a row must carry; the check must be written as exactly this line: `return Boolean(run.repo) && Boolean(run.status) && Boolean(run.diffstat || run.stage) && Boolean(run.updated_at);`
4. The list reads `client.runs.list()` across every served repo; the repo switcher filters it.

### T3: Stage blocks in the centre (P3)
Files: `public/lib/stage-blocks.js`, `public/lib/view-run.js`, `public/styles.css`, `tests/stage-blocks.test.ts`
Model: sonnet
Deps: T1
1. Create `public/lib/stage-blocks.js` exporting `stageBlocks(run, stages, events)` that returns one block per stage from `stationStates`: a header line with the stage name, its one-line summary (risk and file count for triage, who approved for plan, `+N −M` for build, `n/m checks` for verify, the PR state for pr) and its duration.
2. Every block is collapsed by default; expanding shows its steps from `runs.events`; the full agent text is one more expand away. The default must be written as exactly this line: `const open = new Set(opts.open ?? []);`
3. Blocks are flat and separated by hairlines (`--line` token); no shadows, no cards.
4. `view-run.js` renders the stage strip, then the blocks, then the pinned composer.

### T4: Composer chips, Ask or Build, runner chip (P4)
Files: `public/lib/composer.js`, `public/lib/view-run.js`, `public/lib/view-home.js`, `public/styles.css`, `tests/composer.test.ts`
Model: sonnet
Deps: T1
1. Create `public/lib/composer.js` exporting `composer({ repos, branches, agents, runners, mode, onSend })`: chips for repo, branch, agent and runner, and a two-state Ask or Build switch. Ask posts a `factory:ask` task (from #203); Build files a ready task.
2. With more than one repo served, the repo chip starts empty and Send stays disabled until one is picked (keeps the pinned behaviour at factory `tests/dashboard-ui.test.ts:224`).
3. On a task page, Enter sends a steer; queued messages show above the composer with Undo until delivered.
4. `view-home.js` renders the large composer and the Needs you cards.

## Tests
- `tests/shell.test.ts`: [permanent] each old hash (`#/line`, `#/board`, `#/runs`, `#/events`, `#/minions`) redirects to its new place and `#/` opens home; the page has no nav rail.
- `tests/rows.test.ts`: [permanent] over the two-repos fixture every row passes `rowShape`; groups hold the counts the fixture implies; no row shows a dollar sign or a model name for a viewer.
- `tests/stage-blocks.test.ts`: [permanent] every block starts collapsed; expanding the build block lists its steps; the header summaries match the fixture.
- `tests/composer.test.ts`: [permanent] Send is disabled with two repos and no pick; Ask mode posts an ask task, Build a ready task; a queued steer shows with Undo and Undo removes it.

## Mutation
```json
{"name":"routes: no redirect","file":"public/lib/routes.js","find":"if (Object.hasOwn(REDIRECTS, value)) return { view: \"redirect\", jobID: \"\", redirect: REDIRECTS[value] };","replace":"","test":"tests/shell.test.ts"}
```
```json
{"name":"rows: diffstat not required","file":"public/lib/task-list.js","find":"Boolean(run.diffstat || run.stage)","replace":"true","test":"tests/rows.test.ts"}
```
```json
{"name":"stages: open by default","file":"public/lib/stage-blocks.js","find":"const open = new Set(opts.open ?? []);","replace":"const open = new Set(stages.map((s) => s.name));","test":"tests/stage-blocks.test.ts"}
```

## Acceptance
- AC-1: the shell is three panes and every old page hash redirects: checked by `bun test tests/shell.test.ts` (T1)
- AC-2: every row says what, where, how big and how old, grouped Needs you, Running, Done: checked by `bun test tests/rows.test.ts` (T2)
- AC-3: stage blocks are collapsed by default and expand to steps: checked by `bun test tests/stage-blocks.test.ts` (T3)
- AC-4: the composer carries repo, branch, agent and runner chips and an Ask or Build mode: checked by `bun test tests/composer.test.ts` (T4)
- AC-5: the repo gate stays green: checked by `make check` (T4)

## Non-goals
- NG-1: right pane, diff comments, previews, palette and phone layout are #208.
- NG-2: backlog columns and the Playwright and Lighthouse bars are #209.
- NG-3: no dark theme; the tokens change on kaas.team first, which is the user's decision.
- NG-4: no new server routes; data comes from the protocol client only.

## Files
- `public/index.html`
- `public/app.js`
- `public/lib/routes.js`
- `public/lib/rail.js`
- `public/lib/task-list.js` (new)
- `public/lib/stage-blocks.js` (new)
- `public/lib/composer.js` (new)
- `public/lib/view-home.js` (new)
- `public/lib/view-run.js`
- `public/styles.css`
- `tests/shell.test.ts` (new)
- `tests/rows.test.ts` (new)
- `tests/stage-blocks.test.ts` (new)
- `tests/composer.test.ts` (new)

## Risk: medium
It replaces the cockpit's navigation, so a bookmark or push link to an old page must still land somewhere; the redirect table and its test cover every old page id. Viewer-leak rules (no cost, no model) carry over through the existing operator check. Rollback: revert the PR; the server and routes are unchanged.
## Model: sonnet

