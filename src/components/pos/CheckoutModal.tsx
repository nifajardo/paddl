"use client";

import React, { useState, useEffect } from "react";
import { CartItem, Customer, PaymentMethod, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Banknote, QrCode, BookOpen, Clock, AlertTriangle, UserCheck, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  customers: Customer[];
  onCompleteCheckout: (data: {
    items: CartItem[];
    subtotal: number;
    discountType: "NONE" | "SENIOR_PWD_20" | "CUSTOM";
    discountAmount: number;
    total: number;
    paymentMethod: PaymentMethod;
    amountTendered: number;
    changeDue: number;
    customerId?: string;
    customerName?: string;
    ewalletRefNumber?: string;
    isBackdated?: boolean;
    customDate?: string;
    notes?: string;
  }) => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  subtotal,
  customers,
  onCompleteCheckout,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discountType, setDiscountType] = useState<"NONE" | "SENIOR_PWD_20" | "CUSTOM">("NONE");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  
  // Cash Tender
  const [tenderAmount, setTenderAmount] = useState<string>("");
  // E-Wallet
  const [ewalletRef, setEwalletRef] = useState<string>("");
  // Credit / Utang
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  // Backdating
  const [isBackdated, setIsBackdated] = useState<boolean>(false);
  const [backdateValue, setBackdateValue] = useState<string>("");
  // Notes
  const [notes, setNotes] = useState<string>("");

  // Calculate discounts
  const discountAmount = React.useMemo(() => {
    if (discountType === "SENIOR_PWD_20") {
      // 20% statutory discount
      return Math.round(subtotal * 0.2 * 100) / 100;
    }
    if (discountType === "CUSTOM") {
      return Math.min(subtotal, Math.max(0, customDiscount));
    }
    return 0;
  }, [subtotal, discountType, customDiscount]);

  const finalTotal = Math.max(0, subtotal - discountAmount);
  const parsedTender = parseFloat(tenderAmount) || 0;
  const changeDue = Math.max(0, parsedTender - finalTotal);

  // Set default backdate to yesterday when toggled
  useEffect(() => {
    if (isBackdated && !backdateValue) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setBackdateValue(yesterday.toISOString().slice(0, 16));
    }
  }, [isBackdated, backdateValue]);

  // Set default customer
  useEffect(() => {
    if (paymentMethod === "CREDIT_UTANG" && !selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [paymentMethod, selectedCustomerId, customers]);

  // Auto-fill exact tender for E-wallet
  useEffect(() => {
    if (paymentMethod === "GCASH" || paymentMethod === "MAYA") {
      setTenderAmount(finalTotal.toString());
    }
  }, [paymentMethod, finalTotal]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const creditLimitExceeded =
    paymentMethod === "CREDIT_UTANG" &&
    selectedCustomer &&
    selectedCustomer.totalDebt + finalTotal > selectedCustomer.creditLimit;

  const isFormValid = React.useMemo(() => {
    if (cart.length === 0) return false;
    if (paymentMethod === "CASH") {
      return parsedTender >= finalTotal;
    }
    if (paymentMethod === "GCASH" || paymentMethod === "MAYA") {
      return true;
    }
    if (paymentMethod === "CREDIT_UTANG") {
      return Boolean(selectedCustomerId);
    }
    return true;
  }, [cart, paymentMethod, parsedTender, finalTotal, selectedCustomerId]);

  const handleQuickCash = (amount: number) => {
    setTenderAmount(amount.toString());
  };

  const handleExactCash = () => {
    setTenderAmount(finalTotal.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore in test environments
    }

    onCompleteCheckout({
      items: cart,
      subtotal,
      discountType,
      discountAmount,
      total: finalTotal,
      paymentMethod,
      amountTendered: paymentMethod === "CASH" ? parsedTender : finalTotal,
      changeDue: paymentMethod === "CASH" ? changeDue : 0,
      customerId: paymentMethod === "CREDIT_UTANG" ? selectedCustomerId : undefined,
      customerName:
        paymentMethod === "CREDIT_UTANG" && selectedCustomer
          ? selectedCustomer.name
          : undefined,
      ewalletRefNumber: ewalletRef ? ewalletRef.trim() : undefined,
      isBackdated,
      customDate: isBackdated && backdateValue ? new Date(backdateValue).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Checkout Order</span>
            <span className="text-emerald-600 font-extrabold text-2xl">
              ₱{finalTotal.toFixed(2)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Discount Selectors */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Discounts & Privileges</span>
              {discountAmount > 0 && (
                <span className="text-emerald-600 font-bold">
                  -₱{discountAmount.toFixed(2)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={discountType === "NONE" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setDiscountType("NONE")}
              >
                Regular (No Discount)
              </Button>
              <Button
                type="button"
                variant={discountType === "SENIOR_PWD_20" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 bg-blue-700 text-white hover:bg-blue-800"
                onClick={() => setDiscountType("SENIOR_PWD_20")}
              >
                Senior / PWD 20%
              </Button>
              <Button
                type="button"
                variant={discountType === "CUSTOM" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setDiscountType("CUSTOM")}
              >
                Custom ₱ Off
              </Button>
            </div>
            {discountType === "CUSTOM" && (
              <div className="pt-2 flex items-center gap-2">
                <Label htmlFor="custom-disc" className="text-xs shrink-0">
                  Discount Amount (₱):
                </Label>
                <Input
                  id="custom-disc"
                  type="number"
                  min="0"
                  max={subtotal}
                  value={customDiscount || ""}
                  onChange={(e) => setCustomDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-8 text-xs bg-white"
                />
              </div>
            )}
          </div>

          {/* Payment Method Tabs */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Select Payment Method
            </Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "CASH" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  paymentMethod === "CASH" ? "bg-emerald-600 text-white" : ""
                }`}
                onClick={() => setPaymentMethod("CASH")}
              >
                <Banknote className="h-5 w-5" />
                <span>Cash</span>
              </Button>

              <Button
                type="button"
                variant={paymentMethod === "GCASH" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  paymentMethod === "GCASH" ? "bg-blue-600 text-white" : ""
                }`}
                onClick={() => setPaymentMethod("GCASH")}
              >
                <QrCode className="h-5 w-5" />
                <span>GCash</span>
              </Button>

              <Button
                type="button"
                variant={paymentMethod === "MAYA" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  paymentMethod === "MAYA" ? "bg-green-700 text-white" : ""
                }`}
                onClick={() => setPaymentMethod("MAYA")}
              >
                <QrCode className="h-5 w-5" />
                <span>Maya</span>
              </Button>

              <Button
                type="button"
                variant={paymentMethod === "CREDIT_UTANG" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  paymentMethod === "CREDIT_UTANG" ? "bg-amber-600 text-white" : ""
                }`}
                onClick={() => setPaymentMethod("CREDIT_UTANG")}
              >
                <BookOpen className="h-5 w-5" />
                <span>Utang / Credit</span>
              </Button>
            </div>
          </div>

          {/* CASH TENDER DETAILS */}
          {paymentMethod === "CASH" && (
            <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <Label htmlFor="tender-amount" className="text-xs font-bold text-emerald-950">
                  Amount Received from Customer (₱)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[11px] bg-white text-emerald-700 border-emerald-300"
                  onClick={handleExactCash}
                >
                  Exact (₱{finalTotal.toFixed(2)})
                </Button>
              </div>

              <Input
                id="tender-amount"
                type="number"
                step="any"
                min="0"
                value={tenderAmount}
                onChange={(e) => setTenderAmount(e.target.value)}
                placeholder="0.00"
                className="text-xl font-bold bg-white h-12 text-emerald-950"
                autoFocus
              />

              {/* Quick Philippine Bills */}
              <div className="grid grid-cols-5 gap-1.5">
                {[50, 100, 200, 500, 1000].map((bill) => (
                  <Button
                    key={bill}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white font-medium hover:bg-emerald-50"
                    onClick={() => handleQuickCash(bill)}
                  >
                    ₱{bill}
                  </Button>
                ))}
              </div>

              {/* Change Calculation Box */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200">
                <span className="text-xs font-semibold text-slate-600">Change Due to Customer:</span>
                <span
                  className={`text-xl font-black ${
                    parsedTender >= finalTotal ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {parsedTender >= finalTotal
                    ? `₱${changeDue.toFixed(2)}`
                    : `Lacking ₱${(finalTotal - parsedTender).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          {/* GCASH / MAYA DETAILS */}
          {(paymentMethod === "GCASH" || paymentMethod === "MAYA") && (
            <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                <QrCode className="h-4 w-4 text-blue-600" />
                <span>Scan Merchant QR Ph / E-Wallet Reference</span>
              </div>
              <p className="text-xs text-blue-700">
                Ensure customer scans your official store QR Ph and shows the confirmed payment screen.
              </p>
              <div>
                <Label htmlFor="ewallet-ref" className="text-xs font-medium text-slate-700">
                  Transaction Reference Number (Optional):
                </Label>
                <Input
                  id="ewallet-ref"
                  value={ewalletRef}
                  onChange={(e) => setEwalletRef(e.target.value)}
                  placeholder="e.g. 109283746129"
                  className="bg-white text-xs mt-1"
                />
              </div>
            </div>
          )}

          {/* CREDIT / UTANG DETAILS */}
          {paymentMethod === "CREDIT_UTANG" && (
            <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="cust-select" className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                  Select Customer for Utang Ledger:
                </Label>
                <span className="text-[11px] text-amber-800 font-medium">
                  {customers.length} registered
                </span>
              </div>

              <select
                id="cust-select"
                className="w-full h-10 px-3 text-sm rounded-md border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Current Utang: ₱{c.totalDebt.toFixed(2)} / Limit: ₱{c.creditLimit})
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Existing Balance:</span>
                    <span className="font-bold text-amber-700">₱{selectedCustomer.totalDebt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">New Total Debt After Sale:</span>
                    <span className="font-extrabold text-red-600">
                      ₱{(selectedCustomer.totalDebt + finalTotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 border-t pt-1">
                    <span>Credit Limit: ₱{selectedCustomer.creditLimit.toFixed(2)}</span>
                    <span>Phone: {selectedCustomer.phone}</span>
                  </div>
                </div>
              )}

              {creditLimitExceeded && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Warning: This transaction exceeds customer&apos;s approved credit limit!</span>
                </div>
              )}
            </div>
          )}

          {/* BACKDATED SALES OPTION - Addresses Peddlr's Weakness */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="backdate-toggle" className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <Clock className="h-4 w-4 text-purple-600" />
                <span>Log as Backdated Transaction</span>
              </label>
              <input
                id="backdate-toggle"
                type="checkbox"
                checked={isBackdated}
                onChange={(e) => setIsBackdated(e.target.checked)}
                className="h-4 w-4 rounded text-purple-600"
              />
            </div>

            {isBackdated && (
              <div className="pt-2 space-y-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-[11px] text-purple-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Fixes Peddlr double-counting bug: Properly mapped to historical ledger</span>
                </div>
                <div>
                  <Label htmlFor="backdate-input" className="text-xs text-slate-600">
                    Actual Date and Time of Sale:
                  </Label>
                  <Input
                    id="backdate-input"
                    type="datetime-local"
                    value={backdateValue}
                    onChange={(e) => setBackdateValue(e.target.value)}
                    className="h-8 text-xs bg-white mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="checkout-notes" className="text-xs text-slate-500">
              Transaction Notes (Optional)
            </Label>
            <Input
              id="checkout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. For Birthday party, Sukli is owed later, etc."
              className="text-xs h-8 bg-white"
            />
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isFormValid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
            >
              Complete Sale (₱{finalTotal.toFixed(2)})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
