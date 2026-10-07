import test from "node:test";
import assert from "node:assert/strict";
import { validateCheckout, calculateReturn, linePaidTotal, retainedCost, netSale, businessDate, csvCell } from "../src/lib/commerce.ts";
import type { Product, Transaction, Customer } from "../src/types/index.ts";
const product: Product = { id: "p1", name: "Rice", barcode: "123", category: "Rice", costPrice: 8, sellingPrice: 15, stock: 10, minStockAlert: 2, unit: "kg", emoji: "", isActive: true, createdAt: "", updatedAt: "" };
const customer: Customer = { id: "c1", name: "Ana", phone: "", creditLimit: 100, totalDebt: 90, createdAt: "" };
function checkout(overrides = {}) { return { items: [{ product, quantity: 1, subtotal: 15, customDiscount: 0 }], subtotal: 15, discountAmount: 3, total: 12, paymentMethod: "CASH" as const, amountTendered: 20, changeDue: 8, ...overrides }; }
function txn(): Transaction { return { ...checkout(), id: "t1", receiptNumber: "PD-TEST", status: "COMPLETED", cashierName: "Owner", createdAt: new Date().toISOString() }; }
test("checkout recomputes amounts and keeps fractional quantities", () => {
  const result = validateCheckout(checkout({ items: [{ product, quantity: .5, subtotal: 999, customDiscount: 0 }], subtotal: 999, discountAmount: 0, total: 7.5 }), [product], []);
  assert.equal(result.subtotal, 7.5); assert.equal(result.cashReceived, 7.5); assert.equal(result.changeDue, 12.5);
});
test("overselling is rejected instead of clamping stock", () => assert.throws(() => validateCheckout(checkout({ items: [{ product, quantity: 11, subtotal: 165, customDiscount: 0 }] }), [product], []), /Only 10/));
test("expired and inactive products cannot be sold", () => {
  assert.throws(() => validateCheckout(checkout(), [{ ...product, expirationDate: "2020-01-01" }], []), /expired/);
  assert.throws(() => validateCheckout(checkout(), [{ ...product, isActive: false }], []), /no longer available/);
});
test("price changes reject a stale cart", () => assert.throws(() => validateCheckout(checkout(), [{ ...product, sellingPrice: 20 }], []), /price changed/));
test("duplicate and nonfinite quantities are rejected", () => {
  assert.throws(() => validateCheckout(checkout({ items: [...checkout().items, ...checkout().items] }), [product], []), /Duplicate/);
  assert.throws(() => validateCheckout(checkout({ items: [{ ...checkout().items[0], quantity: NaN }] }), [product], []), /Quantity/);
});
test("utang requires a customer and respects credit limits", () => {
  assert.throws(() => validateCheckout(checkout({ paymentMethod: "CREDIT_UTANG" }), [product], []), /Select a customer/);
  assert.throws(() => validateCheckout(checkout({ paymentMethod: "CREDIT_UTANG", customerId: "c1" }), [product], [customer]), /credit limit/);
});
test("split tender records net cash, excluding change", () => {
  const result = validateCheckout(checkout({ paymentMethod: "SPLIT", splitDetail: { cashAmount: 20, digitalAmount: 5, digitalMethod: "GCASH" } }), [product], []);
  assert.equal(result.cashReceived, 7); assert.equal(result.changeDue, 13);
});
test("negative, overpaid digital, and insufficient split tenders are rejected", () => {
  for (const [cashAmount, digitalAmount] of [[-1, 13], [0, 15], [1, 1]]) assert.throws(() => validateCheckout(checkout({ paymentMethod: "SPLIT", splitDetail: { cashAmount, digitalAmount, digitalMethod: "GCASH" } }), [product], []));
});
test("full refund never returns the undiscounted sticker price", () => { assert.equal(calculateReturn(txn(), [{ productId: "p1", quantity: 1 }])[0].refundAmount, 12); });
test("successive fractional returns allocate the last cent exactly", () => {
  const t = txn(); t.items[0].quantity = 3; t.total = 10; t.subtotal = 15;
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const items = calculateReturn(t, [{ productId: "p1", quantity: 1 }]); total += items[0].refundAmount;
    t.returnHistory = [...(t.returnHistory || []), { id: "" + i, transactionId: t.id, receiptNumber: t.receiptNumber, returnedItems: items, totalRefundAmount: items[0].refundAmount, reason: "test", processedBy: "owner", createdAt: "" }];
  }
  assert.equal(Math.round(total * 100), 1000);
  assert.throws(() => calculateReturn(t, [{ productId: "p1", quantity: 1 }]), /Only 0/);
});
test("duplicate returns cannot refund a line twice", () => assert.throws(() => calculateReturn(txn(), [{ productId: "p1", quantity: .5 }, { productId: "p1", quantity: .5 }]), /Duplicate/));
test("voided or refunded transactions cannot be returned", () => {
  for (const status of ["VOIDED", "REFUNDED"] as const) assert.throws(() => calculateReturn({ ...txn(), status }, [{ productId: "p1", quantity: 1 }]), /cannot be returned/);
});
test("line allocation sums to the sale total", () => { const t = txn(); t.items.push({ product: { ...product, id: "p2" }, quantity: 1, customDiscount: 0, subtotal: 15 }); t.subtotal = 30; t.total = 19.99; assert.equal(Math.round(linePaidTotal(t, "p1") * 100) + Math.round(linePaidTotal(t, "p2") * 100), 1999); });
test("net sale and COGS use historical snapshots", () => { assert.equal(retainedCost(txn()), 8); assert.equal(netSale({ ...txn(), refundedAmount: 3 }), 9); assert.equal(netSale({ ...txn(), status: "VOIDED" }), 0); });
test("business dates use Manila across UTC midnight", () => { assert.equal(businessDate("2026-10-06T17:00:00Z"), "2026-10-07"); });
test("CSV quotes values and neutralizes formula injection", () => { assert.equal(csvCell('a,"b'), '"a,""b"'); assert.equal(csvCell("=1+1"), '"\'=1+1"'); });
