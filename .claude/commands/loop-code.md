---
description: Implement strictly per an approved issue plan, verify, and open a PR
argument-hint: <issue-number>
---

Issue number: `$ARGUMENTS`

You are running phase 2 (Code + Verify) of this repo's lean loop workflow.

1. Fetch the issue: `gh issue view $ARGUMENTS --json title,body,comments`.
   The `## Plan` section must exist and the `loop-state` phase must be
   `planned`. If not, stop and say so — do not improvise a plan here.
2. If the plan hasn't been explicitly approved by the human (check for a
   confirmation in the issue comments or ask in chat if unclear), stop and
   ask before writing code.
3. Implement strictly per the approved plan. Don't add scope beyond the
   issue's acceptance criteria — if you notice something else worth doing,
   note it as a follow-up suggestion rather than doing it inline.
4. Run the relevant tests/lint for whatever you touched (client/ and/or
   server/ package scripts). Fix failures. Don't skip or weaken tests to
   make them pass.
5. Open a PR: `gh pr create --title "..." --body-file <file>`. The PR
   description must include:
   - Reference to the issue (`Closes #$ARGUMENTS`)
   - What was verified (which tests ran, and the result)
   - A hidden HTML comment block recording run-state for resumability, e.g.:
     ```
     <!-- loop-state
     phase: coded
     review-rounds: 0
     -->
     ```
6. Update the issue's `loop-state` phase to `coded`.
7. Stop. Summarize the PR to the human. Independent review now runs
   automatically in GitHub Actions on this PR (see
   `.github/workflows/claude-code-review.yml`) — you don't need to trigger
   it, and you should not review your own PR in this session.
