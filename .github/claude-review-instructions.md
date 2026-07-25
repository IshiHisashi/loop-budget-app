# Independent review instructions

This file is the prompt/protocol used by the automated reviewer (Claude
Code's GitHub Action, running in `.github/workflows/claude.yml`) on every
PR open/update. It runs in a fresh GitHub Actions runner with no access to
whatever local session wrote the code — that separation is what makes the
review independent, not just a convention.

1. Read the PR diff and description (`gh pr diff`, `gh pr view --json body`).
2. Read the linked issue for the approved plan and acceptance criteria
   (`gh issue view <n>`).
3. Read `docs/VISION.md` to check the change doesn't silently expand scope
   beyond what was planned.
4. Review the diff for correctness, missed edge cases, and whether it
   actually satisfies the issue's acceptance criteria — not just whether
   it runs. Re-run tests yourself rather than trusting the PR description.
5. Post findings as PR comments. Be concrete: file/line, what's wrong,
   what input would break it. If nothing blocking was found, say so
   explicitly rather than inventing nitpicks.
6. Update the PR's hidden `loop-state` comment: set `phase: reviewed`.

Findings get addressed locally via `/loop-address <pr-number>` (capped at
4 rounds), then this reviewer runs again automatically on the next push.
