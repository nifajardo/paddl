"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { CartItem, Customer, PaymentMethod, Transaction, SplitPaymentDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Banknote, QrCode, BookOpen, Clock, AlertTriangle, UserCheck, ShieldCheck, Copy, Check, Layers, CreditCard, Smartphone } from "lucide-react";

import { toast } from "sonner";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  customers: Customer[];
  onCompleteCheckout: (data: {
    requestId?: string;
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
    splitDetail?: SplitPaymentDetail;
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
  const { settings } = useStore();
  const [requestId] = useState(() => crypto.randomUUID());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discountType, setDiscountType] = useState<"NONE" | "SENIOR_PWD_20" | "CUSTOM">("NONE");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  
  // Cash Tender
  const [tenderAmount, setTenderAmount] = useState<string>("");
  // E-Wallet
  const [ewalletRef, setEwalletRef] = useState<string>("");
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  // Split Tender State
  const [splitCashAmount, setSplitCashAmount] = useState<string>("");
  const [splitDigitalMethod, setSplitDigitalMethod] = useState<"GCASH" | "MAYA" | "BANK_TRANSFER" | "CARD">("GCASH");
  const [splitDigitalAmount, setSplitDigitalAmount] = useState<string>("");
  const [splitDigitalRef, setSplitDigitalRef] = useState<string>("");
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

  const parsedSplitCash = parseFloat(splitCashAmount) || 0;
  const parsedSplitDigital = parseFloat(splitDigitalAmount) || 0;
  const splitTotalTendered = parsedSplitCash + parsedSplitDigital;
  const splitChangeDue = Math.max(0, parsedSplitCash - (finalTotal - parsedSplitDigital));

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
    } else if (paymentMethod === "SPLIT") {
      if (!splitCashAmount && !splitDigitalAmount) {
        const half = Math.round((finalTotal / 2) * 100) / 100;
        setSplitCashAmount(half.toString());
        setSplitDigitalAmount((finalTotal - half).toString());
      }
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
    if (paymentMethod === "SPLIT") {
      return parsedSplitCash >= 0 && splitTotalTendered >= finalTotal && parsedSplitDigital > 0 && parsedSplitDigital <= finalTotal;
    }
    if (paymentMethod === "CREDIT_UTANG") {
      return Boolean(selectedCustomerId) && Boolean(selectedCustomer && selectedCustomer.totalDebt + finalTotal <= selectedCustomer.creditLimit);
    }
    return true;
  }, [cart, paymentMethod, parsedTender, finalTotal, selectedCustomerId, selectedCustomer, splitTotalTendered, parsedSplitDigital, parsedSplitCash]);

  const handleQuickCash = (amount: number) => {
    setTenderAmount(amount.toString());
  };

  const handleExactCash = () => {
    setTenderAmount(finalTotal.toString());
  };

  const handleSplitCashChange = (val: string) => {
    setSplitCashAmount(val);
    const cashNum = parseFloat(val) || 0;
    const remaining = Math.max(0, finalTotal - cashNum);
    setSplitDigitalAmount(remaining > 0 ? remaining.toFixed(2) : "0");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;



    const isSplit = paymentMethod === "SPLIT";
    const tendered = isSplit
      ? splitTotalTendered
      : paymentMethod === "CASH"
      ? parsedTender
      : finalTotal;

    const change = isSplit
      ? splitChangeDue
      : paymentMethod === "CASH"
      ? changeDue
      : 0;

    onCompleteCheckout({
      requestId,
      items: cart,
      subtotal,
      discountType,
      discountAmount,
      total: finalTotal,
      paymentMethod,
      amountTendered: tendered,
      changeDue: change,
      customerId: paymentMethod === "CREDIT_UTANG" ? selectedCustomerId : undefined,
      customerName:
        paymentMethod === "CREDIT_UTANG" && selectedCustomer
          ? selectedCustomer.name
          : undefined,
      ewalletRefNumber: isSplit ? splitDigitalRef.trim() : (ewalletRef ? ewalletRef.trim() : undefined),
      splitDetail: isSplit
        ? {
            cashAmount: parsedSplitCash,
            digitalMethod: splitDigitalMethod,
            digitalAmount: parsedSplitDigital,
            digitalRefNumber: splitDigitalRef.trim() || undefined,
          }
        : undefined,
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
                20% demo discount
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
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
                variant={paymentMethod === "SPLIT" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  paymentMethod === "SPLIT" ? "bg-purple-600 text-white" : ""
                }`}
                onClick={() => setPaymentMethod("SPLIT")}
              >
                <Layers className="h-5 w-5" />
                <span>Split Bill</span>
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

          {/* GCASH / MAYA DETAILS - Official QR Ph Integration */}
          {(paymentMethod === "GCASH" || paymentMethod === "MAYA") && (() => {
            const isGcash = paymentMethod === "GCASH";
            const walletNumber = isGcash 
              ? (settings.gcashNumber || settings.phone || "0917-889-1234")
              : (settings.mayaNumber || settings.phone || "0917-889-1234");
            const isValidRef = ewalletRef.trim().length === 13;

            return (
              <div className={`space-y-3 p-4 rounded-xl border ${isGcash ? "bg-blue-50/70 border-blue-200" : "bg-emerald-50/70 border-emerald-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-black ${isGcash ? "bg-blue-600" : "bg-emerald-600"}`}>
                      {isGcash ? "G" : "M"}
                    </div>
                    <div>
                      <span className={`text-xs font-bold ${isGcash ? "text-blue-900" : "text-emerald-900"}`}>
                        {isGcash ? "GCash / QR Ph National QR" : "Maya / QR Ph Business"}
                      </span>
                      <p className="text-[10px] text-slate-500">
                        Scan to Pay with any Philippine Banking or E-Wallet App
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${isGcash ? "border-blue-400 text-blue-700 bg-white" : "border-emerald-400 text-emerald-700 bg-white"}`}>
                    BSP QR Ph Certified
                  </Badge>
                </div>

                {/* Customer-Facing QR Terminal Mockup */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                  {/* High contrast QR representation */}
                  <div className="relative h-28 w-28 bg-slate-900 p-2 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-inner">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded">
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-transparent" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className={`h-4 w-4 ${isGcash ? "bg-blue-600" : "bg-emerald-600"} rounded-2xs flex items-center justify-center text-[7px] text-white font-black`}>QR</div>
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-transparent" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                      <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                    </div>
                    <span className="text-[9px] text-emerald-400 font-mono font-bold mt-1">
                      ₱{finalTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <div className="text-[11px] font-medium text-slate-500">Merchant Account:</div>
                    <div className="font-bold text-xs text-slate-900">{settings.storeName}</div>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-1 pt-0.5">
                      <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {walletNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(walletNumber);
                          setCopiedNumber(true);
                          toast.success("Phone number copied!");
                          setTimeout(() => setCopiedNumber(false), 2000);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-800 transition"
                        title="Copy account number"
                      >
                        {copiedNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500">
                      Amount: <span className="font-bold text-slate-900 text-xs">₱{finalTotal.toFixed(2)}</span> (Exact)
                    </div>
                  </div>
                </div>

                {/* Anti-Scam Reference Number Validator */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ewallet-ref" className="text-xs font-semibold text-slate-800">
                      Payment Reference Number (Anti-Fake Screenshot Check):
                    </Label>
                    {isValidRef ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Valid 13-digit format
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ewalletRef.length}/13 digits
                      </span>
                    )}
                  </div>
                  <Input
                    id="ewallet-ref"
                    value={ewalletRef}
                    onChange={(e) => setEwalletRef(e.target.value)}
                    placeholder="e.g. 1092837461290 (13 digits on customer's SMS/screen)"
                    className={`bg-slate-50 text-xs h-9 font-mono transition ${isValidRef ? "border-emerald-500 ring-1 ring-emerald-500" : ""}`}
                  />
                </div>
              </div>
            );
          })()}

          {/* SPLIT PAYMENT (Cash + Digital / E-Wallet) */}
          {paymentMethod === "SPLIT" && (
            <div className="space-y-3 bg-purple-50/70 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-purple-600 flex items-center justify-center text-white text-xs font-black">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-900">
                      Split Bill (Combined Cash & Digital)
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Customer pays partly in Cash and balance via GCash, Maya, Bank, or Card
                    </p>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Total: ₱{finalTotal.toFixed(2)}
                </div>
              </div>

              {/* Portion 1: Cash */}
              <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="split-cash-input" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                    1. Cash Received:
                  </Label>
                  <span className="text-[10px] text-slate-400">Added to Cash Drawer</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₱</span>
                    <Input
                      id="split-cash-input"
                      type="number"
                      step="any"
                      min="0"
                      value={splitCashAmount}
                      onChange={(e) => handleSplitCashChange(e.target.value)}
                      placeholder="0.00"
                      className="pl-7 font-bold text-sm bg-slate-50"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                    onClick={() => {
                      const half = Math.round((finalTotal / 2) * 100) / 100;
                      handleSplitCashChange(half.toString());
                    }}
                  >
                    50 / 50
                  </Button>
                </div>
              </div>

              {/* Portion 2: Digital Tender */}
              <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                    2. Digital Balance Payment:
                  </Label>
                  <span className="text-[10px] text-slate-400">Non-Cash Reconciliation</span>
                </div>

                {/* Digital method selector */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "GCASH", label: "GCash" },
                    { id: "MAYA", label: "Maya" },
                    { id: "BANK_TRANSFER", label: "Bank" },
                    { id: "CARD", label: "Card" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSplitDigitalMethod(m.id as any)}
                      className={`text-xs py-1.5 px-2 rounded-md font-semibold transition border ${
                        splitDigitalMethod === m.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label htmlFor="split-digital-amt" className="text-[11px] text-slate-500">
                      Digital Amount (₱)
                    </Label>
                    <Input
                      id="split-digital-amt"
                      type="number"
                      step="any"
                      min="0"
                      value={splitDigitalAmount}
                      onChange={(e) => setSplitDigitalAmount(e.target.value)}
                      placeholder="0.00"
                      className="font-bold text-sm bg-slate-50 h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="split-digital-ref" className="text-[11px] text-slate-500">
                      Reference / Auth Code
                    </Label>
                    <Input
                      id="split-digital-ref"
                      value={splitDigitalRef}
                      onChange={(e) => setSplitDigitalRef(e.target.value)}
                      placeholder="e.g. 109283746..."
                      className="text-xs bg-slate-50 h-9 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Split Summary & Change */}
              <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Tendered (Cash + Digital):</span>
                  <span className="font-bold text-slate-900">₱{splitTotalTendered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Cash Change Due:</span>
                  <span className={`font-black text-sm ${splitTotalTendered >= finalTotal ? "text-emerald-600" : "text-rose-600"}`}>
                    {splitTotalTendered >= finalTotal
                      ? `₱${splitChangeDue.toFixed(2)}`
                      : `Lacking ₱${(finalTotal - splitTotalTendered).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CREDIT / UTANG DETAILS - Advanced Credit Guard */}
          {paymentMethod === "CREDIT_UTANG" && (() => {
            const currentDebt = selectedCustomer?.totalDebt || 0;
            const newTotalDebt = currentDebt + finalTotal;
            const limit = selectedCustomer?.creditLimit || 2000;
            const percentUsed = Math.min(100, Math.round((newTotalDebt / limit) * 100));
            const isExceeded = newTotalDebt > limit;

            return (
              <div className="space-y-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200">
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
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-md border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Utang: ₱{c.totalDebt.toFixed(2)} / Limit: ₱{c.creditLimit})
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Existing Utang Balance:</span>
                      <span className="font-bold text-amber-800">₱{currentDebt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-semibold">New Total Balance After Sale:</span>
                      <span className={`font-black text-sm ${isExceeded ? "text-rose-600" : "text-slate-900"}`}>
                        ₱{newTotalDebt.toFixed(2)}
                      </span>
                    </div>

                    {/* Visual Credit Limit Progress Bar */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Credit Limit: ₱{limit.toFixed(2)}</span>
                        <span className={`font-bold ${isExceeded ? "text-rose-600" : percentUsed > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                          {percentUsed}% utilized
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isExceeded ? "bg-rose-500" : percentUsed > 80 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Customer Phone: {selectedCustomer.phone || "No phone"}</span>
                      <span>Payment Agreement: Pays on Payday</span>
                    </div>
                  </div>
                )}

                {isExceeded && (
                  <div className="flex items-center gap-2 p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-rose-900 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>⚠️ Warning: Transaction will exceed credit limit by ₱{(newTotalDebt - limit).toFixed(2)}! Store owner consent required.</span>
                  </div>
                )}
              </div>
            );
          })()}

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
