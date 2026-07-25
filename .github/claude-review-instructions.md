# Independent review instructions

This file is the prompt/protocol used by the automated reviewer (Claude
Code's GitHub Action, running in `.github/workflows/claude-code-review.yml`)
on every non-draft PR open/update. It runs in a fresh GitHub Actions
runner with no access to whatever local session wrote the code — that
separation is what makes the review independent, not just a convention.

## Turn / token budget

CI caps tool turns. Prioritize posting a formal review over exhaustive
exploration. A short review that lands on the PR beats a perfect review
that never posts.

Do **not** install dependencies or run `npm` / test suites in this job.
Trust the PR's test-plan checklist and any existing checks; judge the
diff and whether tests *look* adequate.

## Round cap

This repo caps automated review ↔ address cycles at **2 rounds per PR**.

1. Read the PR body (`gh pr view <n> --json body`) and find the hidden
   `<!-- loop-state ... -->` block. Note `review-rounds`.
2. If `review-rounds` is already `2` (or higher):
   - Do **not** do another deep review.
   - Submit a single `gh pr review --comment` explaining that the
     automated review cap has been reached and a human must judge/merge
     or reject.
   - Stop.

## Review protocol

1. Read the PR diff and description (`gh pr diff`, `gh pr view --json body`).
2. Read the linked issue for the approved plan and acceptance criteria
   (`gh issue view <n>`).
3. Read `docs/VISION.md` to check the change doesn't silently expand scope
   beyond what was planned.
4. Review the diff for correctness, missed edge cases, and whether it
   actually satisfies the issue's acceptance criteria — not just whether
   it runs. Spot-check that claimed tests exist and cover the new paths;
   do not execute them here.
5. Post findings on the PR — this is mandatory output, and must happen
   before you exhaust turns:
   - Concrete line-level issues via
     `mcp__github_inline_comment__create_inline_comment` (with
     `confirmed: true`): file/line, what's wrong, what input would break
     it. Cap at a handful of the highest-severity findings.
   - Then submit a **formal GitHub review** with `gh pr review`:
     - `--request-changes` if anything blocking remains
     - `--approve` if acceptance criteria are met and nothing blocking
     - `--comment` only for non-blocking notes with no blockers
   - If nothing blocking was found, say so explicitly rather than
     inventing nitpicks — then `--approve`.
6. If turns remain, update the PR's hidden `loop-state` via
   `gh pr edit` / `gh api`: set `phase: reviewed`.
   (Do not increment `review-rounds` here — `/loop-address` owns that
   counter.) If updating the body would burn remaining turns, skip it —
   the formal review is the deliverable.

Findings get addressed locally via `/loop-address <pr-number>` (capped at
2 rounds), then this reviewer runs again automatically on the next push.
After round 2, stop automating and leave the human to merge or intervene.
