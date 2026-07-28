# Roadmap

Backlog of epics derived from `docs/VISION.md`, priority-ordered. Each
epic becomes a GitHub issue (using
`.github/ISSUE_TEMPLATE/feature-spec.md`) when it's actually picked up —
issues are not pre-created for the whole backlog up front.

## v1

1. **Project bootstrap** — React client, Node/Express server, MongoDB
   connection, health-check endpoint, dev scripts, test runner wired up
   for both client and server.
2. **Category model** — predefined categories seeded on first run, plus
   CRUD for user-defined custom categories.
3. **Monthly budget setup** — assign a budget amount per category, per
   month.
4. **Expense logging** — CRUD for manual spending entries (date, amount,
   category, note).
5. **Budget vs actual view** — per-category, per-month comparison of
   budgeted vs actual spend.

## Technical

Not derived from `VISION.md` — engineering/stack decisions, tracked here
only for prioritization since they affect when the `## v1` epics below
land, not what they do. See `CLAUDE.md`'s Stack section for the
authority on current stack choices.

- **TypeScript conversion** (#12) — convert `client/` and `server/` from
  JavaScript to TypeScript. Prioritized ahead of items 3–5 below, so
  those land as TypeScript from the start.

## Later (currently non-goals — see VISION.md)

- Recurring transactions
- Multi-device sync
- Bank/account sync or auto-import
- Multi-user / auth
