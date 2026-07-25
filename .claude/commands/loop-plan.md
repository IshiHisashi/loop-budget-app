---
description: Draft a spec/plan for a feature issue, then stop for human approval
argument-hint: <issue-number>
---

Issue number: `$ARGUMENTS`

You are running phase 1 (Plan) of this repo's lean loop workflow. Read
`CLAUDE.md` and `docs/VISION.md` first if you haven't already this
session.

1. Fetch the issue: `gh issue view $ARGUMENTS --json title,body,comments`.
2. Confirm the issue cites a section of `docs/VISION.md`. If it doesn't,
   stop and ask the human to add one before planning — don't guess scope.
3. Read whatever existing code is relevant (client/, server/) to ground
   the plan in what actually exists, not assumptions.
4. Fill in the issue's Acceptance Criteria / Test Plan sections concretely
   (they may currently be empty template placeholders), and add a `## Plan`
   section describing the concrete implementation approach. If there's a
   real design choice (e.g. schema shape, endpoint shape), present the
   options with a recommendation rather than silently picking one.
5. Write this back to the issue body with `gh issue edit $ARGUMENTS --body-file <file>`
   (fetch the current body, append/fill in sections, don't clobber
   unrelated content). Update the hidden `loop-state` comment's `phase` to
   `planned`.
6. Stop. Do not write any application code in this phase. Summarize the
   plan to the human in the chat and ask them to approve it (edit the
   issue directly, or reply here) before you run `/loop-code`.
