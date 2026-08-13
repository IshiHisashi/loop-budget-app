# Product Vision — loop-budget-app

This document is the source of truth for what this app is and is not. Every
feature spec (GitHub issue) should cite the section of this doc it serves.
If a proposed feature doesn't trace back to something here, either the
feature is out of scope or this doc is out of date — update this doc first,
then write the spec.

## Problem

Track monthly spending against a personal budget, logged manually. Each
user tracks their own budget independently of every other user.

## Target user

Anyone who signs up for an account. Multi-user support is in scope as
of the account-signup epic (see Core v1 features) — each user's data is
private to them; the app has no shared or cross-user views.

## Core v1 features

- **Multi-user accounts**: sign up with an id/password, log in, log
  out. Every user's budgets, categories, and expenses are private to
  them — real per-user data isolation (not merely the defense-in-depth
  `userId` tagging the single-user-era login originally added; see
  #40/#41, which predate this scope change and will need revisiting
  against it). Supersedes the earlier single-fixed-credential login
  (#39) — that issue's "no accounts, no signup" framing no longer
  reflects current scope.
- **Monthly budgets**: set a budget amount split across categories, per
  month.
- **Categories**: predefined categories available out of the box (e.g.
  Food, Rent, Transport, Entertainment, Utilities), plus the ability to
  add fully custom categories.
- **Manual expense logging**: log individual spending entries — date,
  amount, category, optional note. Browse logged entries scoped to a
  given month, including a calendar view of that month's entries.
- **Budget vs actual**: view actual spend against budget, per category,
  per month.

## Non-goals for v1

Explicit, so the loop doesn't scope-creep during planning:

- Bank/account sync or auto-imported transactions
- Password reset / account recovery flows — signup and login are in
  scope, recovering a lost password is not, yet
- Shared or collaborative data between users — every user's budgets,
  categories, and expenses stay private to them; no team/household
  accounts or cross-user visibility
- Social/OAuth login — id/password only
- Multi-device sync (beyond each user being able to log into their own
  account from any device — that's just login working normally, not a
  sync feature)
- Mobile app
- Recurring-transaction automation

These may become real epics later, but only after an explicit VISION.md
update — not as a side effect of an unrelated feature's spec.

## Principles

- Small, verified increments — prefer shipping one thin vertical slice
  (e.g. "log an expense") over a wide partial implementation.
- Every feature issue must link back to the relevant section of this doc.
- Scope changes go through this document first, then flow down into
  `docs/ROADMAP.md` and individual issues — not the other way around.
