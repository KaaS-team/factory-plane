BRANCH: cluster/plane-v0.1-cockpit
HEAD: abc93128d24fbd4365e43bbd41257b9473b6cfe3
## Summary
Five of the six acceptance lines for #1 already held on release/v0.1.0. I added the missing browser tests for the shell, a redirect and the composer.
## Issues
- #1: done (partly already held).
  - Three-pane shell: already held in public/index.html. Now tested by "shell: task list left, selected task centre, context pane right" (test/browser-shell.test.js). Mutation file: none, this repo has no tests/mutations.
  - Old links redirect: already held (src/routes.js, test/cockpit-shell.test.js). Browser test "redirect: an old board link lands on the list". Checked by hand: pointing board elsewhere fails it.
  - Two-line rows: already held (taskRow in test/cockpit-shell.test.js). The browser shell test also checks that l1 and l2 are visible.
  - Collapsed stage blocks: already held (stageBlocks in test/cockpit-shell.test.js). The browser shell test checks that no stage block starts open.
  - Composer chips and Ask or Build: already held (src/composer.js). Browser test "composer: repo, branch, agent, runner chips and Ask or Build mode". Checked by hand: renaming the ask option or the chip class fails it.
  - Browser tests: added test/browser-shell.test.js with 3 tests. They pass 3 runs in a row with --test-concurrency=1.
## Staged workflow changes
none
## Files outside my area
none
## Gate evidence
npm run check: # tests 69, # pass 69, # fail 0
## Risk and rollback
Test-only change. Roll back by reverting commit abc9312.
## Learnings
- This repo has no bun.lock, package-lock.json, Makefile, AGENTS.md, tests/ dir or tests/mutations. The brief's `make test`, `make fast` and mutation-file steps could not be run. Tests live in test/ and `npm run check` runs them with node --test. I did the revert-and-fail check by hand. The brief should be written for this repo's layout.
- `npm run check` lists src and public files by name, so a new source file needs a node --check entry. New test files are picked up by the glob.
- playwright is already resolvable, so the browser tests run here without an install.
