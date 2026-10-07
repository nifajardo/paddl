"use client";
import { useState } from "react";
import {
  Banknote,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Layers,
  Smartphone,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type {
  CartItem,
  Customer,
  PaymentMethod,
  SplitPaymentDetail,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money, peso, type CheckoutInput } from "@/lib/commerce";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  customers: Customer[];
  onCompleteCheckout: (data: CheckoutInput) => string | undefined;
}
const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "GCASH", label: "GCash", icon: Smartphone },
  { id: "MAYA", label: "Maya", icon: Smartphone },
  { id: "SPLIT", label: "Split payment", icon: Layers },
  { id: "CREDIT_UTANG", label: "Utang", icon: BookOpen },
];
export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  subtotal,
  customers,
  onCompleteCheckout,
}: CheckoutModalProps) {
  const { settings, cashDrawer } = useStore();
  const [requestId] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState<"NONE" | "SENIOR_PWD_20" | "CUSTOM">(
    "NONE",
  );
  const [customDiscount, setCustomDiscount] = useState("");
  const [tender, setTender] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [reference, setReference] = useState("");
  const [digitalMethod, setDigitalMethod] =
    useState<SplitPaymentDetail["digitalMethod"]>("GCASH");
  const [digitalAmount, setDigitalAmount] = useState("");
  const [verified, setVerified] = useState(false);
  const [more, setMore] = useState(false);
  const [backdated, setBackdated] = useState(false);
  const [saleDate, setSaleDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const discountValue =
    discount === "SENIOR_PWD_20"
      ? money(subtotal * 0.2)
      : discount === "CUSTOM"
        ? Number(customDiscount)
        : 0;
  const discountValid =
    Number.isFinite(discountValue) &&
    discountValue >= 0 &&
    discountValue <= subtotal;
  const total = money(subtotal - (discountValid ? discountValue : 0));
  const cash = Number(tender);
  const digital = Number(digitalAmount);
  const cashDue = method === "SPLIT" ? money(total - digital) : total;
  const change = money(Math.max(0, cash - cashDue));
  const customer = customers.find((c) => c.id === customerId);
  const creditRemaining = customer
    ? money(customer.creditLimit - customer.totalDebt)
    : 0;
  const isDigital = method === "GCASH" || method === "MAYA";
  const takesCash = method === "CASH" || (method === "SPLIT" && cashDue > 0);
  const short = takesCash && cash < cashDue;
  const valid =
    cart.length > 0 &&
    discountValid &&
    Number.isFinite(cash) &&
    cash >= 0 &&
    (!takesCash ||
      (cash >= cashDue && (backdated || cashDrawer.status === "OPEN"))) &&
    (!isDigital || verified) &&
    (method !== "SPLIT" ||
      (verified &&
        Number.isFinite(digital) &&
        digital > 0 &&
        digital <= total &&
        cash >= cashDue)) &&
    (method !== "CREDIT_UTANG" || (!!customer && total <= creditRemaining)) &&
    (!backdated ||
      (!!saleDate &&
        Number.isFinite(Date.parse(saleDate)) &&
        Date.parse(saleDate) <= Date.now()));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!valid) return;
    const result = onCompleteCheckout({
      requestId,
      items: cart,
      subtotal,
      discountType: discount,
      discountAmount: discountValue,
      total,
      paymentMethod: method,
      amountTendered:
        method === "CASH"
          ? cash
          : method === "SPLIT"
            ? money(cash + digital)
            : method === "CREDIT_UTANG"
              ? 0
              : total,
      changeDue: takesCash ? change : 0,
      customerId: method === "CREDIT_UTANG" ? customerId : undefined,
      customerName: method === "CREDIT_UTANG" ? customer?.name : undefined,
      ewalletRefNumber: reference.trim() || undefined,
      splitDetail:
        method === "SPLIT"
          ? {
              cashAmount: cash,
              digitalAmount: digital,
              digitalMethod,
              digitalRefNumber: reference.trim() || undefined,
            }
          : undefined,
      isBackdated: backdated,
      customDate: backdated ? new Date(saleDate).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
    if (result) setError(result);
  }
  const walletNumber =
    method === "MAYA" ? settings.mayaNumber : settings.gcashNumber;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="checkout-dialog">
        <DialogHeader className="checkout-heading">
          <div>
            <div className="eyebrow">FINISH THIS ORDER</div>
            <DialogTitle>Checkout</DialogTitle>
            <p>
              {cart.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
              {settings.storeName}
            </p>
          </div>
          <div className="checkout-total">
            <span>Total to pay</span>
            <strong>{peso(total)}</strong>
            {discountValid && discountValue > 0 && (
              <small>{peso(discountValue)} discount applied</small>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={submit} className="checkout-form">
          <section className="checkout-section">
            <div className="checkout-section-title">
              <h3>Discount</h3>
              <span>Optional</span>
            </div>
            <div className="discount-options">
              {[
                { id: "NONE", label: "No discount" },
                { id: "SENIOR_PWD_20", label: "20% off" },
                { id: "CUSTOM", label: "Custom amount" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={discount === d.id}
                  className={discount === d.id ? "selected" : ""}
                  onClick={() => {
                    setDiscount(d.id as typeof discount);
                    setVerified(false);
                  }}
                >
                  {discount === d.id && <Check size={14} />}
                  {d.label}
                </button>
              ))}
            </div>
            {discount === "CUSTOM" && (
              <label className="field-label mt-3">
                Discount amount (₱)
                <input
                  className="field-input"
                  inputMode="decimal"
                  type="number"
                  step=".01"
                  min="0"
                  max={subtotal}
                  value={customDiscount}
                  onChange={(e) => {
                    setCustomDiscount(e.target.value);
                    setVerified(false);
                  }}
                  placeholder="0.00"
                />
              </label>
            )}
            {!discountValid && (
              <p className="form-error">
                Enter a discount between ₱0 and {peso(subtotal)}.
              </p>
            )}
            {discount === "SENIOR_PWD_20" && (
              <p className="checkout-note">
                Simple demo discount. Statutory senior/PWD and VAT calculations
                are not applied.
              </p>
            )}
          </section>
          <section className="checkout-section">
            <div className="checkout-section-title">
              <h3>Payment method</h3>
            </div>
            <div className="payment-options">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={method === m.id}
                  className={method === m.id ? "selected" : ""}
                  onClick={() => {
                    setMethod(m.id);
                    setVerified(false);
                    setError("");
                  }}
                >
                  <m.icon size={20} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </section>
          {method === "SPLIT" && (
            <section className="checkout-section payment-detail">
              <h3 className="text-sm font-semibold">Digital portion</h3>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="field-label">
                  Paid using
                  <select
                    className="field-input"
                    value={digitalMethod}
                    onChange={(e) =>
                      setDigitalMethod(e.target.value as typeof digitalMethod)
                    }
                  >
                    {["GCASH", "MAYA", "BANK_TRANSFER", "CARD"].map((m) => (
                      <option key={m} value={m}>
                        {m.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Digital amount (₱)
                  <input
                    className="field-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={total}
                    step=".01"
                    value={digitalAmount}
                    onChange={(e) => {
                      setDigitalAmount(e.target.value);
                      setVerified(false);
                    }}
                    placeholder="0.00"
                  />
                </label>
              </div>
              <p className="checkout-note">
                Remaining cash payment: {peso(Math.max(0, cashDue))}
              </p>
            </section>
          )}
          {(method === "CASH" || method === "SPLIT") && (
            <section className="checkout-section cash-detail">
              <div className="cash-label-row">
                <label htmlFor="checkout-cash">Cash received (₱)</label>
                <button
                  type="button"
                  onClick={() => setTender(Math.max(0, cashDue).toFixed(2))}
                >
                  Use exact amount
                </button>
              </div>
              <input
                id="checkout-cash"
                className="cash-input"
                type="number"
                inputMode="decimal"
                step=".01"
                min="0"
                value={tender}
                onChange={(e) => setTender(e.target.value)}
                placeholder="0.00"
              />
              <div className="quick-cash">
                {[50, 100, 200, 500, 1000].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setTender(String(n))}
                  >
                    ₱{n.toLocaleString()}
                  </button>
                ))}
              </div>
              <div
                className={"change-summary " + (short ? "short" : "")}
                aria-live="polite"
              >
                <span>{short ? "Still to collect" : "Change to give"}</span>
                <strong>{peso(short ? cashDue - cash : change)}</strong>
              </div>
              {cashDrawer.status !== "OPEN" && !backdated && (
                <p className="form-error">
                  Open a shift in Cash & expenses before accepting cash.
                </p>
              )}
            </section>
          )}
          {(isDigital || method === "SPLIT") && (
            <section className="checkout-section payment-detail">
              {isDigital && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-sm">{method} payment</strong>
                    <p className="checkout-note">
                      {walletNumber ||
                        "No merchant number configured. Add it in Settings."}
                    </p>
                  </div>
                  {walletNumber && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(walletNumber);
                          setCopied(true);
                        } catch {
                          setError(
                            "Unable to copy. Please copy the displayed number manually.",
                          );
                        }
                      }}
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied" : "Copy number"}
                    </button>
                  )}
                </div>
              )}
              {isDigital && settings.qrPhImageUrl && (
                <img
                  src={settings.qrPhImageUrl}
                  alt="Merchant-provided payment QR code"
                  className="h-40 w-40 object-contain mx-auto my-3"
                />
              )}
              <label className="field-label mt-3">
                Payment reference (optional)
                <input
                  className="field-input"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference from the actual payment"
                />
              </label>
              <label className="payment-verification">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                <span>
                  I checked that {peso(method === "SPLIT" ? digital : total)}{" "}
                  was received in the merchant account.
                </span>
              </label>
              <p className="checkout-note">
                Paddl records this payment. It does not process or verify money
                transfers.
              </p>
            </section>
          )}
          {method === "CREDIT_UTANG" && (
            <section className="checkout-section credit-detail">
              <label className="field-label">
                Customer
                <select
                  className="field-input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Choose a customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {peso(c.totalDebt)} outstanding
                    </option>
                  ))}
                </select>
              </label>
              {customer ? (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Available credit</span>
                    <strong>{peso(creditRemaining)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Balance after this sale</span>
                    <strong>{peso(customer.totalDebt + total)}</strong>
                  </div>
                  {total > creditRemaining && (
                    <p className="form-error">
                      This order exceeds the customer’s credit limit. Collect an
                      existing balance or choose another payment method.
                    </p>
                  )}
                </div>
              ) : (
                <p className="checkout-note">
                  Add a new customer in Customers & utang before recording their
                  first credit sale.
                </p>
              )}
            </section>
          )}
          <button
            type="button"
            className="checkout-more"
            onClick={() => setMore(!more)}
            aria-expanded={more}
          >
            <span>Notes & sale date</span>
            <ChevronDown size={16} className={more ? "rotate-180" : ""} />
          </button>
          {more && (
            <section className="checkout-section space-y-4">
              <label className="field-label">
                Notes
                <input
                  className="field-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional order details"
                />
              </label>
              <label className="flex gap-2 text-xs items-center">
                <input
                  type="checkbox"
                  checked={backdated}
                  onChange={(e) => setBackdated(e.target.checked)}
                />
                Record a past sale
              </label>
              {backdated && (
                <>
                  <label className="field-label">
                    Sale date and time
                    <input
                      className="field-input"
                      type="datetime-local"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      required
                    />
                  </label>
                  <p className="checkout-note">
                    Backdated sales update stock and reports, but do not change
                    today’s cash drawer.
                  </p>
                </>
              )}
            </section>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="checkout-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Back to order
            </button>
            <button type="submit" className="primary-button" disabled={!valid}>
              <Check size={17} />
              Complete sale · {peso(total)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
