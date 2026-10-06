"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Customer, DebtEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Phone, 
  UserCheck, 
  AlertTriangle, 
  DollarSign, 
  MessageSquare, 
  History, 
  CheckCircle2, 
  Copy, 
  Send,
  Calendar,
  Wallet,
  Printer
} from "lucide-react";
import { DebtReceiptModal } from "./DebtReceiptModal";
import { sound } from "@/lib/sounds";
import { toast } from "sonner";

export function CreditView() {
  const { customers, debtEntries, settings, currentStaff, addCustomer, recordDebtPayment, addManualDebt } = useStore();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_DEBT" | "NO_DEBT">("WITH_DEBT");

  // Selected Customer for Ledger Drawer
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isManualDebtModalOpen, setIsManualDebtModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    receiptNo: string;
    customerName: string;
    amountPaid: number;
    paymentMethod: string;
    remainingDebt: number;
    date: string;
    notes?: string;
  } | null>(null);

  // Payment Form
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<"CASH" | "GCASH">("CASH");
  const [payNotes, setPayNotes] = useState<string>("");

  // Manual Debt Form
  const [debtAmount, setDebtAmount] = useState<string>("");
  const [debtNotes, setDebtNotes] = useState<string>("");

  // Add Customer Form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState("2000");
  const [newNotes, setNewNotes] = useState("");

  const [copiedSms, setCopiedSms] = useState(false);

  // Totals
  const totalReceivables = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const debtorsCount = customers.filter((c) => c.totalDebt > 0).length;
  const zeroDebtorsCount = customers.filter((c) => c.totalDebt === 0).length;

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      let matchesFilter = true;
      if (filterType === "WITH_DEBT") matchesFilter = c.totalDebt > 0;
      if (filterType === "NO_DEBT") matchesFilter = c.totalDebt === 0;
      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filterType]);

  // Active customer entries
  const customerEntries = useMemo(() => {
    if (!activeCustomer) return [];
    return debtEntries.filter((d) => d.customerId === activeCustomer.id);
  }, [debtEntries, activeCustomer]);

  // Payment actions
  const handleOpenPayment = (c: Customer) => {
    setActiveCustomer(c);
    setPayAmount(c.totalDebt.toString());
    setPayMethod("CASH");
    setPayNotes("Full / Partial Utang Settlement");
    setIsPaymentModalOpen(true);
  };

  const handleOpenManualDebt = (c: Customer) => {
    setActiveCustomer(c);
    setDebtAmount("");
    setDebtNotes("");
    setIsManualDebtModalOpen(true);
  };

  const handleOpenSms = (c: Customer) => {
    setActiveCustomer(c);
    setCopiedSms(false);
    setIsSmsModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) return;

    sound.chaChing();
    recordDebtPayment(activeCustomer.id, amt, payMethod, payNotes);
    setIsPaymentModalOpen(false);

    const remaining = Math.max(0, activeCustomer.totalDebt - amt);
    setLastPaymentReceipt({
      receiptNo: `UTANG-ACK-${Date.now().toString().slice(-6)}`,
      customerName: activeCustomer.name,
      amountPaid: amt,
      paymentMethod: payMethod,
      remainingDebt: remaining,
      date: new Date().toISOString(),
      notes: payNotes,
    });
    setIsReceiptModalOpen(true);
    toast.success(`₱${amt.toFixed(2)} payment recorded for ${activeCustomer.name}!`);

    // Refresh active customer data
    const updated = customers.find((c) => c.id === activeCustomer.id);
    if (updated) {
      setActiveCustomer({
        ...updated,
        totalDebt: remaining,
      });
    }
  };

  const handleSaveManualDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const amt = parseFloat(debtAmount) || 0;
    if (amt <= 0) return;

    addManualDebt(activeCustomer.id, amt, debtNotes);
    setIsManualDebtModalOpen(false);

    const updated = customers.find((c) => c.id === activeCustomer.id);
    if (updated) {
      setActiveCustomer({
        ...updated,
        totalDebt: updated.totalDebt + amt,
      });
    }
  };

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created = addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim() || undefined,
      creditLimit: parseFloat(newCreditLimit) || 1500,
      notes: newNotes.trim() || undefined,
    });

    setIsAddCustomerOpen(false);
    setActiveCustomer(created);
  };

  // SMS Generator template
  const generateSmsMessage = (cust: Customer) => {
    return `Magandang araw po ${cust.name}! Paalala lamang po mula sa ${settings.storeName} patungkol sa inyong utang/balanse na ₱${cust.totalDebt.toFixed(2)}. Maaari po kayong magbayad via Cash sa tindahan o via GCash. Maraming salamat po sa inyong suporta!`;
  };

  const handleCopySms = (cust: Customer) => {
    navigator.clipboard.writeText(generateSmsMessage(cust));
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-amber-600" />
            Credit Book (Utang Ledger)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track customer store credit, debt balances, payment history, and SMS reminders
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setNewName("");
            setNewPhone("");
            setNewAddress("");
            setNewCreditLimit("2000");
            setNewNotes("");
            setIsAddCustomerOpen(true);
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Register Customer
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-white border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Uncollected Utang</span>
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1">
              ₱{totalReceivables.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {debtorsCount} active customers</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Borrowers</span>
              <UserCheck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-800 mt-1">{debtorsCount} Persons</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Currently have outstanding balance</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Settled / Clean Balance</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{zeroDebtorsCount} Persons</div>
            <div className="text-[11px] text-slate-500 mt-0.5">0.00 outstanding debt</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customer by name or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={filterType === "WITH_DEBT" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("WITH_DEBT")}
              className={`text-xs h-9 ${filterType === "WITH_DEBT" ? "bg-amber-600 text-white" : ""}`}
            >
              With Balance ({debtorsCount})
            </Button>
            <Button
              variant={filterType === "NO_DEBT" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("NO_DEBT")}
              className="text-xs h-9"
            >
              Zero Balance ({zeroDebtorsCount})
            </Button>
            <Button
              variant={filterType === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("ALL")}
              className="text-xs h-9"
            >
              All ({customers.length})
            </Button>
          </div>
        </div>

        {/* Customer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.map((cust) => {
            const isExceeded = cust.totalDebt > cust.creditLimit;
            const hasDebt = cust.totalDebt > 0;

            return (
              <div
                key={cust.id}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-sm transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{cust.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {cust.phone || "No phone"}
                      </p>
                    </div>

                    {hasDebt ? (
                      <Badge
                        variant="secondary"
                        className={`text-xs font-bold ${
                          isExceeded
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-amber-100 text-amber-900 border-amber-200"
                        }`}
                      >
                        ₱{cust.totalDebt.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                        Paid / Clean
                      </Badge>
                    )}
                  </div>

                  {cust.address && (
                    <p className="text-[11px] text-slate-400 mt-2 truncate">📍 {cust.address}</p>
                  )}
                  {cust.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">
                      &quot;{cust.notes}&quot;
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setActiveCustomer(cust)}
                    className="text-xs text-slate-700 flex-1"
                  >
                    <History className="h-3 w-3 mr-1" /> Ledger
                  </Button>

                  {hasDebt && (
                    <>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenSms(cust)}
                        className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        title="Send SMS Reminder"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => handleOpenPayment(cust)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        Receive Pay
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No customers found matching your criteria.
          </div>
        )}
      </div>

      {/* CUSTOMER LEDGER DRAWER */}
      {Boolean(activeCustomer) && (
        <Sheet open={Boolean(activeCustomer)} onOpenChange={(open) => !open && setActiveCustomer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 flex flex-col">
          {activeCustomer && (
            <>
              <SheetHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-lg font-bold">{activeCustomer.name}</SheetTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{activeCustomer.phone}</p>
                    {activeCustomer.address && (
                      <p className="text-xs text-slate-400">📍 {activeCustomer.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Utang</span>
                    <span className="text-xl font-black text-amber-700">
                      ₱{activeCustomer.totalDebt.toFixed(2)}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 py-3 border-b">
                <Button
                  size="sm"
                  onClick={() => handleOpenPayment(activeCustomer)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  disabled={activeCustomer.totalDebt <= 0}
                >
                  Pay Utang
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenManualDebt(activeCustomer)}
                  className="text-xs h-8 text-amber-700 border-amber-300"
                >
                  + Add Utang
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSms(activeCustomer)}
                  className="text-xs h-8 text-blue-700 border-blue-200"
                  disabled={activeCustomer.totalDebt <= 0}
                >
                  SMS Notice
                </Button>
              </div>

              {/* Ledger Entries */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Transaction & Payment History:
                </span>

                {customerEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded yet.</p>
                ) : (
                  customerEntries.map((entry) => {
                    const isIncrease = entry.type === "DEBT_INCREASE";

                    return (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                          isIncrease
                            ? "bg-amber-50/60 border-amber-200"
                            : "bg-emerald-50/60 border-emerald-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={isIncrease ? "text-amber-800" : "text-emerald-800"}>
                              {isIncrease ? "Utang Incurred" : "Payment Received"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({new Date(entry.date).toLocaleDateString("en-PH")})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{entry.notes}</p>
                          <span className="text-[10px] text-slate-400">Recorded by: {entry.recordedBy}</span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-black text-sm ${
                              isIncrease ? "text-amber-700" : "text-emerald-700"
                            }`}
                          >
                            {isIncrease ? `+₱${entry.amount.toFixed(2)}` : `-₱${entry.amount.toFixed(2)}`}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Bal: ₱{entry.balanceAfter.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && setIsPaymentModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Collect Payment: {activeCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {activeCustomer && (
            <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center">
                <span className="text-slate-700">Total Outstanding Debt:</span>
                <span className="text-lg font-black text-amber-700">
                  ₱{activeCustomer.totalDebt.toFixed(2)}
                </span>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay-amt" className="text-xs font-semibold">Payment Amount (₱)</Label>
                <div className="flex gap-2">
                  <Input
                    id="pay-amt"
                    type="number"
                    step="any"
                    required
                    min="1"
                    max={activeCustomer.totalDebt}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="text-base font-bold h-10 text-emerald-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPayAmount(activeCustomer.totalDebt.toString())}
                    className="text-xs shrink-0"
                  >
                    Full Payment
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Received Via</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={payMethod === "CASH" ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-9 ${payMethod === "CASH" ? "bg-emerald-600 text-white" : ""}`}
                    onClick={() => setPayMethod("CASH")}
                  >
                    Cash (Into Register)
                  </Button>
                  <Button
                    type="button"
                    variant={payMethod === "GCASH" ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-9 ${payMethod === "GCASH" ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => setPayMethod("GCASH")}
                  >
                    GCash / E-Wallet
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay-notes" className="text-xs">Notes / Reference</Label>
                <Input
                  id="pay-notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Partial cash payment, boundary boundary"
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border rounded-lg flex justify-between text-xs">
                <span>Remaining Utang After Payment:</span>
                <span className="font-bold text-slate-800">
                  ₱{Math.max(0, activeCustomer.totalDebt - (parseFloat(payAmount) || 0)).toFixed(2)}
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Confirm Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      )}

      {/* ADD MANUAL DEBT MODAL */}
      {isManualDebtModalOpen && (
        <Dialog open={isManualDebtModalOpen} onOpenChange={(open) => !open && setIsManualDebtModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-900">
              Add Store Credit / Charge to {activeCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {activeCustomer && (
            <form onSubmit={handleSaveManualDebt} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="man-debt-amt" className="text-xs font-semibold">Additional Utang Amount (₱)</Label>
                <Input
                  id="man-debt-amt"
                  type="number"
                  step="any"
                  required
                  min="1"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="text-base font-bold h-10 text-amber-800"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="man-debt-desc" className="text-xs">Reason / Items Borrowed</Label>
                <Input
                  id="man-debt-desc"
                  required
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  placeholder="e.g. 1 Sako Bigas, Ulam, or borrowed cash"
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsManualDebtModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  Record Debt
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      )}

      {/* SMS REMINDER MODAL */}
      {isSmsModalOpen && (
        <Dialog open={isSmsModalOpen} onOpenChange={(open) => !open && setIsSmsModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Polite SMS Payment Reminder
            </DialogTitle>
          </DialogHeader>

          {activeCustomer && (() => {
            const rawPhone = activeCustomer.phone.replace(/[^0-9]/g, "");
            const waPhone = rawPhone.startsWith("0") ? `63${rawPhone.slice(1)}` : rawPhone;
            const messageText = generateSmsMessage(activeCustomer);

            return (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Send a respectful reminder to <strong>{activeCustomer.name}</strong> ({activeCustomer.phone}):
                </p>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-slate-800 font-sans text-xs leading-relaxed select-text shadow-inner">
                  &ldquo;{messageText}&rdquo;
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleCopySms(activeCustomer)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    {copiedSms ? "Copied!" : "Copy Text"}
                  </Button>
                  
                  {activeCustomer.phone && (
                    <a
                      href={`sms:${activeCustomer.phone}?body=${encodeURIComponent(messageText)}`}
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 h-9"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Send SMS
                    </a>
                  )}

                  {activeCustomer.phone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 h-9"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      )}

      {/* REGISTER NEW CUSTOMER DIALOG */}
      {isAddCustomerOpen && (
        <Dialog open={isAddCustomerOpen} onOpenChange={(open) => !open && setIsAddCustomerOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Register New Customer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveNewCustomer} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="cust-name" className="text-xs">Full Name / Nickname</Label>
              <Input
                id="cust-name"
                required
                placeholder="e.g. Mang Boy (Tricycle)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cust-phone" className="text-xs">Phone Number</Label>
                <Input
                  id="cust-phone"
                  placeholder="0918-123-4567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cust-limit" className="text-xs">Credit Limit (₱)</Label>
                <Input
                  id="cust-limit"
                  type="number"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cust-addr" className="text-xs">Address / Location</Label>
              <Input
                id="cust-addr"
                placeholder="e.g. Block 14 Lot 8, Area 2"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cust-note" className="text-xs">Notes / Payment Agreement</Label>
              <Input
                id="cust-note"
                placeholder="e.g. Pays every 15th/30th payday"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                Register Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* COLLECTION ACKNOWLEDGMENT RECEIPT MODAL */}
      {isReceiptModalOpen && lastPaymentReceipt && (
        <DebtReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          settings={settings}
          cashierName={currentStaff.name}
          receiptData={lastPaymentReceipt}
        />
      )}
    </div>
  );
}
