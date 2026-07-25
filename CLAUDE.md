# loop-budget-app

Personal budget tracker. See `docs/VISION.md` for the product vision and
scope (read it first for any scope/priority question) and `docs/ROADMAP.md`
for the current backlog.

## Stack

- **Client**: React
- **Server**: Node/Express
- **Database**: MongoDB

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
5. `/loop-address <PR#>` — fixes findings from step 4, capped at 4 rounds.
   After that it stops and asks the human to merge or intervene. The next
   push re-triggers the automated review.
6. **Human merges.** This is the only step that isn't automatable.

Every feature issue should stay traceable to `docs/VISION.md`. If a task
doesn't map to anything in VISION.md, update VISION.md first — don't let
scope drift in through an issue instead.
