# loop-budget-app

Personal budget tracker. See `docs/VISION.md` for the product vision and
scope (read it first for any scope/priority question) and `docs/ROADMAP.md`
for the current backlog.

## Stack

- **Client**: React
- **Server**: Node/Express
- **Database**: MongoDB
- **Language**: TypeScript (client + server). Issues #2 (Project
  bootstrap) and #3 (Category model) shipped in plain JavaScript — see
  issue #12 for the conversion. New code should still land in JS until
  #12 lands, to avoid a mixed half-converted state; #12 itself is the one
  exception.

Directory layout (client/ and server/ are created by the "Project
bootstrap" epic — if they don't exist yet, that epic hasn't landed):

```
client/    React app
server/    Express API + MongoDB access
docs/      VISION.md, ROADMAP.md
```

Once bootstrapped, dev servers and tests are run per-package (`npm run dev`
/ `npm test` inside `client/` and `server/` respectively) — check each
package's `package.json` scripts rather than assuming a root-level command
exists.

## Working here: the loop

This repo follows a lean loop workflow (plan → code+verify → independent
review → address findings → merge), with GitHub issues/PRs as the durable
record of state — not agent memory. Concretely:

1. A feature starts as a GitHub issue using
   `.github/ISSUE_TEMPLATE/feature-spec.md`, citing the VISION.md section
   it serves.
2. `/loop-plan <issue#>` — writes a concrete spec + design options into
   the issue body. **Stops for human approval** before any code is written.
3. `/loop-code <issue#>` — implements strictly per the approved plan, runs
   tests/lint, opens a PR. The PR description carries run-state (what was
   verified, checklist) in a hidden-comment block.
4. **Independent review runs automatically in GitHub Actions**, not as a
   local command — see `.github/workflows/claude-code-review.yml` (set up
   via Claude Code's `/install-github-app`, authenticated with the
   `CLAUDE_CODE_OAUTH_TOKEN` repo secret) and its prompt,
   `.github/claude-review-instructions.md`. It triggers on every PR
   open/update and runs in a fresh CI runner with no access to whatever
   local session wrote the code — that's a structural guarantee of
   independence, not just a "open a new tab" convention. It posts findings
   as PR comments.
   (`.github/workflows/claude.yml`, also installed by `/install-github-app`,
   is a separate general-purpose assistant triggered by `@claude` mentions
   in issues/PR comments — unrelated to this loop, safe to ignore or use
   ad hoc.)
5. **Addressing findings also runs automatically in GitHub Actions** —
   see `.github/workflows/claude-auto-address.yml`. It triggers whenever
   `claude[bot]` (the step-4 reviewer) submits a "changes requested"
   review on a same-repo PR (forked-repo PRs are skipped — CI can't push
   to those anyway). It reads the PR's hidden `loop-state` `review-rounds`
   count: below the cap it fixes the blocking findings and pushes
   straight to the PR branch (re-triggering step 4 on the new commit);
   at the cap (2 rounds) it leaves a "human decide" comment instead of
   trying again. `/loop-address <PR#>` (`.claude/commands/loop-address.md`)
   is the same protocol runnable locally/interactively — reach for it if
   you want to intervene yourself rather than wait on CI, or if the PR
   needs a decision only a human can make.
6. **Human merges.** This is the only step that isn't automatable.

Every feature issue should stay traceable to `docs/VISION.md`. If a task
doesn't map to anything in VISION.md, update VISION.md first — don't let
scope drift in through an issue instead.

### Working autonomously through steps 2–5

Review in this workflow happens on the PR (step 4), not by watching the
agent's process — so `/loop-plan`, `/loop-code`, and `/loop-address` are
authorized to run the git/npm/gh commands and file edits those steps need
(install deps, run tests/lint, `git add`/`commit`/`push`, `gh pr`/`issue`
create/edit) without stopping for per-command confirmation.
`.claude/settings.json` grants this. It still stops for human input at
the points the loop itself defines: plan approval before `/loop-code`
runs, and the review-round cap in `/loop-address`. Genuinely destructive
git operations (force-push, `reset --hard`, `clean -f`, `branch -D`,
`rm -rf`) stay blocked — those need an explicit ask even inside this
grant.

Step 5's CI automation (`claude-auto-address.yml`) is a separate grant —
scoped to that workflow's own `GITHUB_TOKEN` permissions
(`contents: write`, same-repo PRs only), not `.claude/settings.json`,
since it runs unattended in a GitHub Actions runner rather than a local
session.
