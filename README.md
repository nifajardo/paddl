# Paddl

A responsive business workspace for Filipino small shops. Built with Next.js 16, React 19, TypeScript, Tailwind, and optional Supabase backup storage.

## Run locally

Requires Node.js 22.18+ (Node 24 recommended).

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Open [localhost:3000](http://localhost:3000). Select an industry to enter its demo as owner. The original sample staff PINs remain available through Staff sign in. Demo access and client-side PINs are not production authorization.

## What works

- Demo and Production modes with separate records, backups, staff sessions, and saved carts.
- Production business setup with empty stock and balances; demo guides and sample reset hidden.
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

Use the mode button in the header or sidebar to choose Demo Mode or Production Mode and an industry. Demo Mode retains sample records and industry guides. Production Mode keeps the same interface with demo promotions and reset controls hidden. First-use business setup collects a business name, owner name, a six-digit owner PIN, and optional receipt contact details. Existing businesses require staff PIN sign-in when opened from the mode selector. Add products in Inventory, receive stock, and open a shift in Cash & expenses before accepting cash sales.

Production Mode is prepared for client testing on one device. Local staff PIN access and manual cloud backups retain the limitations below; server-enforced staff authorization and concurrent registers still require further backend work.

All print buttons open a dedicated preview tab. Click **Print / Save PDF** there to open the browser's print dialog. If the tab is blocked, use **Open here** in the notification. Long receipt names wrap while prices retain a separate column, including earlier snapshots after refresh. Receipt previews use an 80mm layout; select the matching paper size and 100% scale in your printer settings. Label sheets use three columns; roll labels use one column. Barcode labels use Code 128 generated with [JsBarcode](https://github.com/lindell/JsBarcode).

Print jobs are stored on the device for up to 24 hours; old snapshots are removed when another job is created. Exported business backups exclude print jobs.

## Data and migration

Demo industries retain their `PADDL_WORKSPACE_V4_<industry>` localStorage entries. Production uses `PADDL_PRODUCTION_V1_<industry>` entries. On first demo load, the prior `PEDDLR_PRO_STORE_V3` workspace is migrated when present; that original entry remains untouched. Restoring a backup from another mode is rejected. Destructive restore/reset first creates a timestamped `PADDL_RECOVERY_<timestamp>` snapshot. Clearing browser data removes local work, so export regularly.

Domain mutations validate a cloned state, persist that whole state synchronously, then update the UI. Failed saves cannot partially apply stock/debt/cash changes. Browser-tab revision checks detect a newer saved workspace, but this is a **single active register** design: localStorage does not provide a cross-tab transactional lock. Never use separate tabs/devices as concurrent live registers.

## Optional cloud backup

1. For a new install, review and run `supabase/schema.sql`. If the earlier backup migration is already installed, apply `supabase/migrations/20261008_workspace_modes.sql` to add separate Production workspace keys and validate mode identity. These files have not been applied automatically to a hosted database.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using `.env.example`. Never use a service-role key in a public environment variable.
3. Create/confirm an account through your Supabase auth administration, then connect it in the app's Settings.
4. Choose Save cloud backup. Another device must explicitly restore the existing backup before attempting a save.

The migration creates `paddl_backups` with owner-scoped SELECT RLS and a security-definer RPC that derives the owner from `auth.uid()`, serializes saves, and checks the expected revision. Clients cannot directly insert/update/delete the table. It also revokes anonymous/authenticated access to the former world-writable demo tables while preserving their records. Review that compatibility change before applying it to an existing project.

Cloud backup is manual, versioned snapshot storage. It is not real-time syncing, a payment gateway, a server-authoritative POS ledger, or a multi-tenant staff authorization system. A conflict preserves local state; export it before restoring the remote version. The repository migration has not been applied automatically to your hosted database.

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

`npm test` runs financial/domain regression tests with Node's test runner. `npm run typecheck` checks all TypeScript. `npm run build` produces the production build. UI verification is performed against the local preview. Lint was not run for this change.
