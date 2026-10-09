# Paddl handoff

## Current objective and branch

Prepare `codex/client-ready` for client testing. Account login and automatic Supabase snapshot saving are implemented; finish the release smoke tests before using real client records. Changes remain in the working tree; no deployment was performed.

## Implemented

- Clean production sign-in, registration, confirmation notice, password reset, and empty business setup. Fresh installations default to Production; Demo records stay separate.
- Supabase account required for production entry. Explicit account login opens the owner workspace; remembered accounts without a staff session require local PIN unlock. Staff PINs are local controls, not server-enforced staff identities.
- Per-account production device storage. Previous unscoped production entries remain untouched and can be explicitly imported in Settings with recovery copies.
- Automatic snapshot upload after an 800 ms pause; retries transient failures every 15 seconds while open. Checkpoints survive reloads and token refresh. Fresh devices download cloud records; conflicting local changes stop uploads rather than overwrite remote work.
- Save status, recovery/export, missing-schema messages, and leave-page warning for pending uploads.
- Production print snapshots are account-bound; print tabs cannot load or save business workspaces. Older unscoped previews can still be viewed in Demo; reopen production documents to create scoped previews.

## Supabase evidence

The user ran `supabase/schema.sql` successfully. `npm run check:cloud` confirms the table exists, anonymous read/save access is blocked, and legacy demo endpoints are inaccessible. The user then added an item, saw Saved online, and found the row in `public.paddl_backups`. Products are nested in `payload.products`, not the retired standalone products table.

## Verified

28 regression tests pass. TypeScript, targeted lint on changed code, production build, and `git diff --check` pass. The local preview responds with HTTP 200 and remains running at localhost:3000. Browser automation was unavailable, so no new phone/tablet screenshots were verified.

## Next checks and limits

Follow `docs/client-testing.md`: confirm reload/fresh-device restoration, offline reconnect, two-account separation, conflict recovery, email/reset redirects, and phone/tablet/desktop layouts. These were not all exercised live. One trusted active register per owner; cloud storage is complete versioned snapshots (10 MB limit), not a concurrent server-authoritative ledger. Configure confirmation emails/password policy/SMTP in Supabase before wider release.

## Agent setup

`gpt-6.1-sol`, medium; full access and no command approvals at the user's request. Ponytail full. Obsidian CLI was unavailable when configured; use this compact note unless the CLI works and the user specifies a vault. Preserve unrelated installed skills and skills-lock.json.
