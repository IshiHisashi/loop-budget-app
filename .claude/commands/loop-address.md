---
description: Fix blocking review findings on a PR (capped at 2 rounds)
argument-hint: <pr-number>
---

PR number: `$ARGUMENTS`

You are running phase 4 (Address Findings) of this repo's lean loop
workflow.

1. Fetch the PR and its review comments: `gh pr view $ARGUMENTS --json body,comments,reviews`.
   Also pull review threads: `gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/comments`.
   Read the hidden `loop-state` block for the current `review-rounds` count.
2. If `review-rounds` is already 2, **stop** — do not attempt another
   round. Tell the human this PR has hit the automated review cap and
   needs a manual merge/reject decision.
3. Otherwise, address each blocking finding from the most recent review
   pass. Don't touch unrelated code. Re-run tests/lint after each fix.
4. Push the fixes to the PR branch. Increment `review-rounds` in the
   hidden `loop-state` comment and set `phase: addressed`.
5. Reply to each finding thread noting how it was resolved (or, if you
   disagree with a finding, say why instead of silently ignoring it).
6. Stop. Pushing to the PR branch re-triggers the automated GitHub Actions
   review. Tell the human the fixes are pushed and another review pass
   will run automatically — you are not the one who gets to decide it's
   now ready to merge. If this push made `review-rounds` reach 2, remind
   them that after the next review the human judges and merges.
