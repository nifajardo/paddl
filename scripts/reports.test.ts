import test from "node:test";
import assert from "node:assert/strict";
import { reportRange, inReportRange } from "../src/lib/reports.ts";
import { retainedLine } from "../src/lib/commerce.ts";
import type { Transaction } from "../src/types/index.ts";

test("custom Philippine date includes midnight and excludes next midnight", () => {
  const range = reportRange("CUSTOM", "2026-10-07", "2026-10-07");
  assert.equal(inReportRange("2026-10-06T16:00:00Z", range), true);
  assert.equal(inReportRange("2026-10-07T15:59:59Z", range), true);
  assert.equal(inReportRange("2026-10-07T16:00:00Z", range), false);
  assert.equal(inReportRange("2026-10-07", range), true);
  assert.equal(inReportRange("invalid", range), false);
});

test("week and month presets use Philippine calendar across year boundaries", () => {
  const now = new Date("2026-01-04T16:01:00Z"); // Monday in Manila
  assert.equal(reportRange("THIS_WEEK", "", "", "", now).start, "2026-01-05");
  assert.equal(reportRange("LAST_WEEK", "", "", "", now).end, "2026-01-04");
  assert.equal(reportRange("LAST_MONTH", "", "", "", now).start, "2025-12-01");
  assert.equal(reportRange("LAST_MONTH", "", "", "", now).end, "2025-12-31");
});

test("product revenue deducts only that item's refund after its allocated discount", () => {
  const txn = {
    status: "PARTIALLY_RETURNED",
    subtotal: 200,
    total: 180,
    items: [
      { product: { id: "a" }, quantity: 2, subtotal: 100 },
      { product: { id: "b" }, quantity: 1, subtotal: 100 },
    ],
    returnHistory: [
      { returnedItems: [{ productId: "a", quantity: 1, refundAmount: 45 }] },
    ],
  } as Transaction;
  assert.deepEqual(retainedLine(txn, "a"), { quantity: 1, revenue: 45 });
  assert.deepEqual(retainedLine(txn, "b"), { quantity: 1, revenue: 90 });
  assert.deepEqual(retainedLine({ ...txn, status: "VOIDED" }, "b"), {
    quantity: 0,
    revenue: 0,
  });
});
