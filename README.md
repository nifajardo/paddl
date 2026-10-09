# Paddl

A responsive business workspace for Filipino small shops. Built with Next.js 16, React 19, TypeScript, Tailwind, and optional Supabase backup storage.

For repository Codex CLI defaults, Ponytail, Obsidian notes, and continuing agent work, see [docs/codex-setup.md](docs/codex-setup.md).

## Run locally

Requires Node.js 22.18+ (Node 24 recommended).

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Open [localhost:3000](http://localhost:3000). Fresh installations open the business account sign-in page. Use Explore demo to select an industry and try sample records. Production requires Supabase account sign-in; local staff PINs are convenience controls on a trusted device, not server authorization. See [client testing setup](docs/client-testing.md) before using real business records.

## What works

- Demo and Production modes with separate records, backups, staff sessions, and saved carts.
- Production account sign-in, registration, password reset, and business setup with empty stock and balances.
- Account-separated production storage, automatic cloud saving with retries, safe initial download, and conflict recovery; requires hosted schema installation.
- Standalone previews for sale/debt receipts, summaries, labels, and restock checklists.

- Four independently saved demo workspaces: sari-sari, motor parts, pharmacy, and café.
- Owner overview, mobile navigation, page search (Ctrl/Cmd+K), F1 register shortcut, industry walkthrough.
- Persistent cart, named held orders, barcode input, cash/digital/split/credit checkout.
- Checkout validation against current stock, expiry, prices, credit limits, and payment amounts.
- Searchable sales history, CSV export, receipts, voids, discounted partial returns, and sellable-stock disposition.
- Product maintenance, stock alerts, customer credit ledger, repayments, expenses, shifts, and audit history.
- Receiving stock and payment in one save, with weighted-average inventory costs.
- JSON backup/export, schema-validated restore, recovery snapshots, optional owner-scoped cloud backups.

The Peddlr research, evidence, audience, and remaining product work are in [docs/product-research.md](docs/product-research.md).

## Using the modes and printing

Use the mode button in the header or sidebar to choose Demo Mode or Production Mode and an industry. Demo Mode retains sample records and industry guides. Production Mode keeps the same interface with demo promotions and reset controls hidden. First-use business setup collects a business name, owner name, a six-digit owner PIN, and optional receipt contact details. Production requires account sign-in before setup or entry. Explicit account sign-in opens the owner workspace. A remembered account without an active staff session requires a staff PIN to unlock this device. Add products in Inventory, receive stock, and open a shift in Cash & expenses before accepting cash sales.

Production is designed for client testing with one trusted active register per owner. The user installed the hosted schema, and anonymous storage access checks pass. Complete the authenticated account and device checks in [docs/client-testing.md](docs/client-testing.md) before treating cloud saving as operational. Separate server-enforced staff identities and concurrent registers still require further backend work.

All print buttons open a dedicated preview tab. Click **Print / Save PDF** there to open the browser's print dialog. If the tab is blocked, use **Open here** in the notification. Long receipt names wrap while prices retain a separate column, including earlier snapshots after refresh. Receipt previews use an 80mm layout; select the matching paper size and 100% scale in your printer settings. Label sheets use three columns; roll labels use one column. Barcode labels use Code 128 generated with [JsBarcode](https://github.com/lindell/JsBarcode).

New production print jobs require the account that created them. Older unscoped previews must be reopened from the workspace when using Production Mode. Print tabs do not load or save the business workspace. Print jobs are stored on the device for up to 24 hours; old snapshots are removed when another job is created. Exported business backups exclude print jobs.

## Data and migration

Demo industries retain their `PADDL_WORKSPACE_V4_<industry>` localStorage entries. Production uses account-separated `PADDL_PRODUCTION_V1_<industry>:<owner-id>` entries. Earlier `PADDL_PRODUCTION_V1_<industry>` records remain untouched and can be explicitly imported into the correct account in Settings. On first demo load, the prior `PEDDLR_PRO_STORE_V3` workspace is migrated when present; that original entry remains untouched. Restoring a backup from another mode is rejected. Destructive restore/reset first creates a timestamped `PADDL_RECOVERY_<timestamp>` snapshot. Clearing browser data removes local work, so export regularly.

Domain mutations validate a cloned state, persist that whole state synchronously, then update the UI. Failed saves cannot partially apply stock/debt/cash changes. Browser-tab revision checks detect a newer saved workspace, but this is a **single active register** design: localStorage does not provide a cross-tab transactional lock. Never use separate tabs/devices as concurrent live registers.

## Cloud storage

1. Review and run `supabase/schema.sql` in your hosted project's SQL Editor. It creates owner-scoped `paddl_backups`, validates workspace identity, and restricts saves to the revision-checked `save_paddl_backup` RPC. No hosted migration has been applied automatically.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using `.env.example`. Never use a service-role key in a public environment variable.
3. Run `npm run check:cloud` to check storage and anonymous access. Configure email confirmation, password policy, SMTP delivery, and allowed redirect URLs in Supabase Authentication.
4. Register/confirm an account through the app. Production saves local changes automatically after a short pause and retries transient failures while open. Demo cloud backups remain manual.

A fresh production device downloads the owner's existing cloud workspace. Local checkpoints retain expected cloud revisions across reloads and auth token refreshes. Dirty local data cannot overwrite an unknown newer cloud version: automatic uploading pauses, and Settings provides export and explicit restore. A recovery copy is kept before restore.

The save function derives the owner from `auth.uid()` and serializes saves. Clients cannot directly insert/update/delete the table. The schema revokes anonymous/authenticated access to former world-writable demo tables while preserving their records; review this compatibility change if another app uses them.

Cloud persistence uses complete versioned snapshots, limited to 10 MB. It is not concurrent multi-register transaction sync, a payment gateway, a server-authoritative POS ledger, or server-enforced staff authorization. A closed browser cannot upload pending changes. Clearing device storage before unsaved records reach the cloud can lose them. See [client testing setup](docs/client-testing.md) for the release smoke test and remaining limits.

## Accounting conventions and limits

- Money rounds to centavos; discounts are allocated to receipt lines using integer centavo allocation. Partial refunds cannot exceed the paid line total.
- Returns optionally restore sellable stock. Damaged/discarded returns keep their historical cost as an expense of the sale.
- Dashboard and reports show sale-cohort net revenue: sales dated in the selected period, adjusted for their recorded returns. These are management estimates, not tax statements.
- Cash drawer movements reflect actual current-shift cash. Backdated sales update stock/history but do not fabricate today's cash receipts.
- Split tender records the cash retained after change. Digital payments are manually recorded; the app does not verify or transfer GCash/Maya funds.
- Already-paid credit reversals need receipt-level repayment allocation; unsupported cases are blocked.
- Each product has one expiry/batch record. Use separate product records for distinct lots until a lot-allocation model is implemented.
- Receipts are acknowledgments. Statutory invoicing, VAT, and senior/PWD rules are not implemented by the demo discount.
- The open app can save locally without internet. Offline reload/cold start and full PWA caching are not implemented.

## Checks

`npm test` runs financial/domain regression tests with Node's test runner. `npm run typecheck` checks all TypeScript. `npm run build` produces the production build. Visual phone/tablet checks remain to be completed; preview browser automation was unavailable in this session. Run targeted lint on changed files. Hosted authenticated saving and responsive visual checks still require the client-testing smoke test.
