# Paddl: product research and direction

Research date: 7 October 2026. This is desk research, not a substitute for merchant interviews.

## Audience and jobs to be done

Peddlr positions itself as a free mobile business tool for Philippine micro, small, and medium businesses, including physical retailers and online sellers. Its basic proposition is accessible sales, inventory, bookkeeping, and reports, including operation without a dependable internet connection. The strongest initial Paddl audience is an owner-operated shop moving from a notebook to its first digital record system. [Peddlr overview](https://www.peddlr.io/en/)

Typical jobs:

| Merchant | Daily job | What matters |
|---|---|---|
| Sari-sari / grocery | Sell individual units, remember prices, track suki credit, replenish essentials | Fast checkout, fractional quantities, clear outstanding balances |
| Motor parts / repair | Combine parts and labor, hold a repair order, collect payment on pickup | Named held orders, product search, accurate stock and receipt history |
| Pharmacy | Find medicines and review expiry and low stock | Generic-name search, expiry blocking, batch-aware inventory workflows |
| Milk tea / café | Take a drink order with add-ons and manage a busy counter | Quick product selection, held orders, payment breakdown |

The four industries above come from the existing Paddl presets. They are a demonstration strategy, not a claim that one generic inventory workflow fully solves pharmacy dispensing or café kitchen operations.

## What Peddlr does well

The official POS page describes product maintenance, phone-camera barcode lookup, peripheral connections, and backdated sales. These are useful baseline capabilities to retain. [Peddlr POS](https://www.peddlr.io/features/pos)

Its app listing includes cash and credit ledgers, expenses, reporting, customer reminders, a store-link ordering feature, load/bills services, and rewards. The differentiator is combining familiar small-shop jobs at a low adoption cost. A June 2026 Play review asks for easier product encoding, illustrating the setup burden merchants face; that is an individual request, not evidence that barcode scanning is absent. [Google Play listing and review](https://play.google.com/store/apps/details?hl=en_US&id=com.blvckbook.peddlr)

## Documented limitations versus reported frustrations

The official FAQ says laptop use is not supported, advises against using an account on two devices because records may be affected, and describes generated receipts as acknowledgments rather than official receipts. Those are stronger evidence than competitor comparisons. [Peddlr FAQ](https://www.peddlr.io/en/faqs)

A December 2024 hardware-store owner reports unreliable device synchronization, small text, and distracting popups, while praising the cash ledger, credit ledger, split cash/credit, purchase receipts, variants, and composite items. They ask for employee permissions, branches, and more detailed reporting. This is historical, self-reported evidence; it cannot establish current defect rates or the experience of every merchant. [Merchant account](https://www.reddit.com/r/BusinessPH/comments/1h8g5mi/are_there_other_apps_like_peddlr/)

## Product choices implemented here

1. **Clarity before promotion.** A calm owner dashboard with real metrics and direct routes to stock, credit, and cash tasks; an unobtrusive guide instead of a floating QA overlay.
2. **Presentations that survive switching.** Four separate local industry workspaces, preserving each workspace's products, cart, held orders, transactions, and settings.
3. **Fewer disconnected steps.** Receiving stock creates a purchase record, weighted-average item cost, expense/payment entry, and audit event together.
4. **Protect the sale.** Validate current stock, active status, expiry, price changes, tender, credit limit, and duplicate lines before any mutation. Save the complete state before reporting success.
5. **Useful history.** Search receipts by product/customer/receipt, filter by Manila business date or payment type, export CSV, reprint, void, and return.
6. **Honest reliability.** Device save and cloud backup are separate states. No anonymous cloud writes, silent overwriting of local work, simulated sync completion, or claim of live multi-register synchronization.
7. **Money follows the real event.** Refunds respect discounts and previous returns; split cash excludes change; stock purchases and owner drawings are excluded from operating expenses; historical cost snapshots stay stable.

## Production roadmap and open questions

This build is a demo/local workspace with optional authenticated cloud backups. Do not market it as a finished production replacement yet.

- Implement a server-authoritative transaction ledger with store membership, per-device command IDs, atomic stock/debt/cash updates, replayable offline outboxes, conflict handling, and audited recovery. Snapshot backups cannot merge concurrent register sales.
- Replace local demo PINs with server-enforced staff identities and scoped permissions. Demo sign-in is intentionally accessible and is not authentication for a live store.
- Add receiving by lot/batch and sale allocation by earliest expiry. Pharmacy prescription validation and regulated workflows need separate design.
- Add café recipes/ingredient deductions and a real fulfillment queue; motor-shop job cards and labor status; retail pack-to-piece conversions and split cash/credit.
- Design credit repayments allocated to specific receipts, including the refund of already-paid credit. The present model blocks unsafe reversals rather than fabricating an allocation.
- Add an installable offline application shell and IndexedDB/event persistence before promising offline cold starts or high-volume storage.
- Validate invoicing, discounts, taxes, printing hardware, accessibility, and data retention with relevant specialists and real merchants before production. The generic 20% demo button is not statutory discount automation.
- Interview 5–8 owners across the four segments. Measure time to first catalog, checkout time, ability to explain cash versus utang, successful restore, and shift variance. Test on an inexpensive Android phone with intermittent connectivity.

Suggested demo: choose a store → new sale → hold and resume → discounted checkout → receipt/history → return → collect utang → receive stock → reconcile cash → switch industry and return to confirm isolation.
