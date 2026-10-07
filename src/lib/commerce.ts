import type {
  CartItem,
  Customer,
  Product,
  Transaction,
} from "../types/index";

export const money = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(n);
export const businessDate = (date: string | Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function nonnegative(n: number, label: string) {
  assert(
    Number.isFinite(n) && n >= 0,
    `${label} must be a valid non-negative number.`,
  );
}
export function positive(n: number, label: string) {
  assert(Number.isFinite(n) && n > 0, `${label} must be greater than zero.`);
}
export function validateProduct(p: Product) {
  assert(p.name.trim(), "Enter a product name.");
  for (const [label, n] of Object.entries({
    Stock: p.stock,
    Cost: p.costPrice,
    Price: p.sellingPrice,
    "Reorder level": p.minStockAlert,
  }))
    nonnegative(n, label);
}
export type CheckoutInput = Pick<
  Transaction,
  | "items"
  | "subtotal"
  | "discountAmount"
  | "total"
  | "paymentMethod"
  | "amountTendered"
  | "changeDue"
> &
  Partial<
    Pick<
      Transaction,
      | "discountType"
      | "customerId"
      | "customerName"
      | "ewalletRefNumber"
      | "splitDetail"
      | "isBackdated"
      | "notes"
      | "requestId"
    >
  > & { customDate?: string };
export function validateCheckout(
  data: CheckoutInput,
  products: Product[],
  customers: Customer[],
) {
  assert(data.items.length > 0, "Add at least one item.");
  const ids = new Set<string>();
  const items: CartItem[] = data.items.map((item) => {
    assert(
      !ids.has(item.product.id),
      "Duplicate cart line. Combine quantities first.",
    );
    ids.add(item.product.id);
    const p = products.find((p) => p.id === item.product.id);
    assert(p?.isActive, `${item.product.name} is no longer available.`);
    positive(item.quantity, "Quantity");
    assert(
      item.quantity <= p.stock,
      `Only ${p.stock} ${p.unit} of ${p.name} available. Update your cart.`,
    );
    assert(
      !p.expirationDate || p.expirationDate >= businessDate(),
      `${p.name} has expired and cannot be sold.`,
    );
    assert(
      p.sellingPrice === item.product.sellingPrice,
      `${p.name}'s price changed. Remove and re-add it.`,
    );
    nonnegative(item.customDiscount, "Item discount");
    const subtotal = money(
      p.sellingPrice * item.quantity - item.customDiscount,
    );
    nonnegative(subtotal, "Line total");
    return {
      product: { ...p },
      quantity: item.quantity,
      customDiscount: item.customDiscount,
      subtotal,
    };
  });
  const subtotal = money(items.reduce((sum, i) => sum + i.subtotal, 0));
  nonnegative(data.discountAmount, "Discount");
  assert(data.discountAmount <= subtotal, "Discount cannot exceed the sale.");
  const total = money(subtotal - data.discountAmount);
  assert(
    Math.abs(total - data.total) < 0.01,
    "Order total changed. Please review checkout.",
  );
  assert(
    [
      "CASH",
      "GCASH",
      "MAYA",
      "BANK_TRANSFER",
      "CARD",
      "CREDIT_UTANG",
      "SPLIT",
    ].includes(data.paymentMethod),
    "Choose a payment method.",
  );
  nonnegative(data.amountTendered, "Payment");
  let cashReceived = 0;
  if (data.paymentMethod === "CASH") {
    assert(
      data.amountTendered >= total,
      "Cash received is less than the total.",
    );
    cashReceived = total;
  }
  if (data.paymentMethod === "SPLIT") {
    assert(data.splitDetail, "Enter both parts of the payment.");
    const { cashAmount, digitalAmount } = data.splitDetail;
    nonnegative(cashAmount, "Cash payment");
    nonnegative(digitalAmount, "Digital payment");
    assert(
      digitalAmount <= total && money(cashAmount + digitalAmount) >= total,
      "Split payments must cover the total; digital payment cannot exceed it.",
    );
    cashReceived = money(total - digitalAmount);
  }
  if (data.paymentMethod === "CREDIT_UTANG") {
    const c = customers.find((c) => c.id === data.customerId);
    assert(c, "Select a customer for utang.");
    assert(
      money(c.totalDebt + total) <= c.creditLimit,
      `${c.name}'s credit limit would be exceeded.`,
    );
  }
  if (data.customDate)
    assert(
      Number.isFinite(Date.parse(data.customDate)) &&
        Date.parse(data.customDate) <= Date.now(),
      "Sale date must be in the past.",
    );
  return {
    items,
    subtotal,
    total,
    cashReceived,
    changeDue:
      data.paymentMethod === "CASH"
        ? money(data.amountTendered - total)
        : data.paymentMethod === "SPLIT"
          ? money(data.splitDetail!.cashAmount - cashReceived)
          : 0,
  };
}

// Largest-remainder allocation keeps every line nonnegative and the total exact in centavos.
export function linePaidTotal(txn: Transaction, productId: string) {
  const totalCents = Math.round(txn.total * 100);
  const allocations = txn.items.map((line, index) => {
    const exact = txn.subtotal
      ? (line.subtotal / txn.subtotal) * totalCents
      : 0;
    return {
      id: line.product.id,
      index,
      cents: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  let left = totalCents - allocations.reduce((s, a) => s + a.cents, 0);
  for (const a of [...allocations].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  )) {
    if (left <= 0) break;
    a.cents++;
    left--;
  }
  return (allocations.find((a) => a.id === productId)?.cents || 0) / 100;
}
export function calculateReturn(
  txn: Transaction,
  requested: { productId: string; quantity: number }[],
) {
  assert(
    txn.status === "COMPLETED" || txn.status === "PARTIALLY_RETURNED",
    "This sale cannot be returned.",
  );
  assert(requested.length, "Choose items to return.");
  const seen = new Set<string>();
  return requested.map((ret) => {
    assert(!seen.has(ret.productId), "Duplicate return line.");
    seen.add(ret.productId);
    positive(ret.quantity, "Return quantity");
    const line = txn.items.find((i) => i.product.id === ret.productId);
    assert(line, "Item is not part of this sale.");
    const previous = (txn.returnHistory || [])
      .flatMap((r) => r.returnedItems)
      .filter((i) => i.productId === ret.productId);
    const returned = previous.reduce((s, i) => s + i.quantity, 0);
    const remaining = money(line.quantity - returned);
    assert(
      ret.quantity <= remaining,
      `Only ${remaining} ${line.product.name} can be returned.`,
    );
    const paid = linePaidTotal(txn, ret.productId);
    const refunded = money(previous.reduce((s, i) => s + i.refundAmount, 0));
    const refundAmount =
      ret.quantity === remaining
        ? money(paid - refunded)
        : Math.min(
            money(paid - refunded),
            money((paid / line.quantity) * ret.quantity),
          );
    return {
      ...ret,
      productName: line.product.name,
      unitPrice: line.product.sellingPrice,
      refundAmount,
    };
  });
}
export function netSale(txn: Transaction) {
  return ["VOID", "VOIDED"].includes(txn.status)
    ? 0
    : money(txn.total - (txn.refundedAmount || 0));
}
export function retainedLine(txn: Transaction, productId: string) {
  const item = txn.items.find(i => i.product.id === productId);
  if (!item || ["VOID", "VOIDED"].includes(txn.status)) return { quantity: 0, revenue: 0 };
  const returns = (txn.returnHistory || []).flatMap(r => r.returnedItems).filter(i => i.productId === productId);
  return {
    quantity: money(Math.max(0, item.quantity - returns.reduce((sum, i) => sum + i.quantity, 0))),
    revenue: money(Math.max(0, linePaidTotal(txn, productId) - returns.reduce((sum, i) => sum + i.refundAmount, 0))),
  };
}
export function retainedCost(txn: Transaction) {
  if (["VOID", "VOIDED"].includes(txn.status)) return 0;
  return money(
    txn.items.reduce((sum, item) => {
      const returned = (txn.returnHistory || [])
        .filter((r) => r.restocked !== false)
        .flatMap((r) => r.returnedItems)
        .filter((i) => i.productId === item.product.id)
        .reduce((s, i) => s + i.quantity, 0);
      return sum + item.product.costPrice * (item.quantity - returned);
    }, 0),
  );
}
export function downloadFile(
  name: string,
  contents: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
}
