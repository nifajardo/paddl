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

- Four independently saved demo workspaces: sari-sari, motor parts, pharmacy, and café.
- Owner overview, mobile navigation, page search (Ctrl/Cmd+K), F1 register shortcut, industry walkthrough.
- Persistent cart, named held orders, barcode input, cash/digital/split/credit checkout.
- Checkout validation against current stock, expiry, prices, credit limits, and payment amounts.
- Searchable sales history, CSV export, receipts, voids, discounted partial returns, and sellable-stock disposition.
- Product maintenance, stock alerts, customer credit ledger, repayments, expenses, shifts, and audit history.
- Receiving stock and payment in one save, with weighted-average inventory costs.
- JSON backup/export, schema-validated restore, recovery snapshots, optional owner-scoped cloud backups.

The Peddlr research, evidence, audience, and remaining product work are in [docs/product-research.md](docs/product-research.md).

## Data and migration

Each industry uses a separate `PADDL_WORKSPACE_V4_<industry>` localStorage entry. On first load, the prior `PEDDLR_PRO_STORE_V3` workspace is migrated when present; that original entry remains untouched. Destructive restore/reset first creates a timestamped `PADDL_RECOVERY_<timestamp>` snapshot. Clearing browser data removes local work, so export regularly.

Domain mutations validate a cloned state, persist that whole state synchronously, then update the UI. Failed saves cannot partially apply stock/debt/cash changes. Browser-tab revision checks detect a newer saved workspace, but this is a **single active register** design: localStorage does not provide a cross-tab transactional lock. Never use separate tabs/devices as concurrent live registers.

## Optional cloud backup

1. Review and run `supabase/migrations/20261007_safe_backups.sql` in your Supabase SQL editor. `supabase/schema.sql` contains the same fresh-install schema.
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
