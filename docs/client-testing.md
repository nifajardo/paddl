# Client testing setup

Branch: `codex/client-ready`. This release targets one trusted register per business owner. It is not a concurrent multi-register POS.

## Connect storage

The user installed `supabase/schema.sql` during development. `npm run check:cloud` now confirms the storage table exists, anonymous reads/saves are blocked, and legacy demo endpoints are inaccessible. The user also confirmed Saved online after adding an item and found the saved row in Supabase. Remaining cross-device, recovery, email, and visual checks are listed below. For a new deployment, use these steps:

1. Open your Supabase project, choose **SQL Editor**, and create a query.
2. Copy `supabase/schema.sql` into it and run it. The script preserves records but revokes anonymous/authenticated access to old demo tables. Check whether another app uses those tables before applying it.
3. Run `npm run check:cloud`. It checks storage and anonymous access without creating business records or printing credentials.
4. In **Authentication → URL Configuration**, set your deployed site's URL and allow its redirect URL. For local testing, allow `http://localhost:3000`. Confirmation and password-reset links return to the app origin.
5. In **Authentication**, enable email/password login, require email confirmation for client accounts, and configure reliable email delivery. Choose a password policy of at least 12 characters; the app requires this for new passwords too. Consider MFA and rate-limit settings before wider release.
6. Register and confirm a dedicated testing account through the app. Do not send passwords through chat or put a service-role key in browser configuration.

Database authorization is enforced by owner-scoped [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and the authenticated save function. UI visibility and local staff PINs are not server authorization.

## Where records appear

Open `public.paddl_backups` in the Supabase Table Editor. Each account/industry has one row; production workspace names begin with `PRODUCTION_`. Products are inside `payload.products`, transactions inside `payload.transactions`, and other records in the same payload. The retired standalone `products` table is not used.

## Account and data behavior

- Fresh installations open the business sign-in page. Previously selected modes remain selected.
- Production requires an account before creating or opening a business. Demo Mode keeps sample records and separate local storage.
- Each production account has separate local records. Existing production records from before account login remain untouched in their original local storage entry.
- To move those old records, sign in, complete business setup, then choose **Settings → Import earlier device workspace**. Confirm that they belong to this account. The original and a recovery copy remain on the device.
- Changed records save locally first. Production automatically uploads a snapshot after a short pause and retries transient failures every 15 seconds while the app is open.
- Refreshing an auth token keeps the current cloud revision. Reopening the app checks the saved revision against the cloud. A fresh device downloads existing cloud records; an unchanged local workspace can download newer records.
- Conflicting local and cloud changes pause uploading. Download a local backup before restoring the cloud version in Settings. There is no automatic merge or force-overwrite button.
- Explicit account sign-in opens the owner workspace. A remembered account without a staff session requires a PIN to unlock the device; remembered staff selection applies only to that account and industry. Local PIN switching includes a short lockout after repeated failed attempts.
- Print tabs remain read-only; they do not initiate workspace downloads or background uploads. New production previews require the account that created them.
- Closing the page with pending uploads shows the browser's leave-page warning. A closed browser cannot sync; keep the page open until **Saved online** appears.

## Required smoke test before clients

1. Confirm an account, sign in, choose an industry, and complete setup. Check that sample stock, debts, and sales are absent.
2. Create a test item. Wait for **Saved online**, reload, and check it remains.
3. Sign in on a second device with that account and confirm its saved workspace downloads. Use only one device for live changes at a time.
4. Disconnect the first device, edit the item, reconnect, and verify automatic saving resumes.
5. With deliberately disposable test records, make different offline changes on two devices. Save one, reconnect the other, and verify that it pauses without overwriting the cloud. Export and restore through Settings.
6. Sign out and use another account. Verify that the first account's business data is not displayed or uploaded into the second account.
7. Test password reset, email confirmation, and staff switching. Check the sign-in and register workflows at phone, tablet, and desktop sizes.

## Release limits

Business data and local staff PINs are stored on the trusted device. PIN permissions are local convenience controls; all cloud writes use the signed-in owner's account. Separate server-enforced staff accounts, device encryption, and concurrent transaction processing require a further backend design. Use trusted devices and do not share the owner's credentials with clients or staff.

The app stores complete workspace snapshots in Supabase, capped at 10 MB per save. This is automatic persistence and recovery, not a server-authoritative financial ledger. Tax invoicing, payment-provider verification, and offline cold-start support retain the limits in README.md.

The initial authenticated upload was confirmed by the user. Cross-device recovery, cross-account RLS, email redirects, and visual responsive testing must still pass before calling the deployment ready for real client records. The user applied the hosted schema; no deployment was performed.
