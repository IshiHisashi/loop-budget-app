# Product Vision — loop-budget-app

This document is the source of truth for what this app is and is not. Every
feature spec (GitHub issue) should cite the section of this doc it serves.
If a proposed feature doesn't trace back to something here, either the
feature is out of scope or this doc is out of date — update this doc first,
then write the spec.

## Problem

Track monthly spending against a personal budget, logged manually.

## Target user

The repo owner, single device, single browser session. No multi-user
support needed — but the app is gated behind a login, since it may be
reachable beyond just the owner's own machine.

## Core v1 features

- **Single-user login**: gate access behind one fixed id/password
  credential (no accounts, no signup, no multi-user support — just a
  login screen standing between the app and whoever reaches it).
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
- Multi-user support (accounts, signup, per-user data) — single-user
  login itself is in scope, see Core v1 features
- Multi-device sync
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
