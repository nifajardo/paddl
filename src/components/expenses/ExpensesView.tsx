"use client";
import { SearchInput } from "@/components/ui/search-input";
import { toast } from "sonner";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Expense, ExpenseCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Coins, 
  Plus, 
  Receipt, 
  TrendingDown, 
  Lock, 
  Unlock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Utilities & Power",
  "Supplier & Stock Restock",
  "Staff Wages",
  "Transportation & Gas",
  "Packaging & Supplies",
  "Repairs & Maintenance",
  "Personal Drawings",
  "Other Expenses",
];

export function ExpensesView() {
  const { 
    expenses, 
    cashDrawer, 
    addExpense, 
    openCashDrawer, 
    closeCashDrawer, 
    logCashAdjustment 
  } = useStore();

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("All");

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isDrawerShiftOpen, setIsDrawerShiftOpen] = useState(false);
  const [isCashAdjustOpen, setIsCashAdjustOpen] = useState(false);

  // Add Expense Form
  const [expCat, setExpCat] = useState<ExpenseCategory>("Supplier & Stock Restock");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expMethod, setExpMethod] = useState<"CASH" | "GCASH" | "BANK">("CASH");
  const [expReceipt, setExpReceipt] = useState("");

  // Cash Drawer Open/Close Form
  const [openingFloat, setOpeningFloat] = useState("1500");
  const [actualClosingCount, setActualClosingCount] = useState("");
  const [drawerNotes, setDrawerNotes] = useState("");

  // Cash In/Out Adjustment Form
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN");
  const [adjustAmt, setAdjustAmt] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCat === "All" || e.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [expenses, search, selectedCat]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    try {
    const amt = parseFloat(expAmount) || 0;
    if (amt <= 0 || !expDesc.trim()) return;

    addExpense({
      category: expCat,
      amount: amt,
      description: expDesc.trim(),
      paymentMethod: expMethod,
      receiptRef: expReceipt.trim() || undefined,
    });

    setIsAddExpenseOpen(false);
    setExpAmount("");
    setExpDesc("");
    setExpReceipt("");
    } catch (error) { toast.error((error as Error).message); }
  };

  const handleSaveDrawerShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashDrawer.status === "OPEN") {
      const actual = parseFloat(actualClosingCount) || 0;
      if (!closeCashDrawer(actual, drawerNotes)) return;
    } else {
      const openAmt = parseFloat(openingFloat) || 0;
      if (!openCashDrawer(openAmt, drawerNotes)) return;
    }
    setIsDrawerShiftOpen(false);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(adjustAmt) || 0;
    if (amt <= 0) return;
    if (!logCashAdjustment(amt, adjustType, adjustReason.trim())) return;
    setIsCashAdjustOpen(false);
    setAdjustAmt("");
    setAdjustReason("");
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Coins className="h-6 w-6 text-indigo-600" />
            Cash & Expense Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track daily operating costs, register cash drawer floats, and reconcile end-of-day cash
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCashAdjustOpen(true)}
            disabled={cashDrawer.status !== "OPEN"}
            className="text-xs h-9"
          >
            Cash In / Out
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddExpenseOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Log Expense
          </Button>
        </div>
      </div>

      {/* Cash Drawer Status Card & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Cash Drawer Box */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    cashDrawer.status === "OPEN" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                  }`}
                />
                <h3 className="font-bold text-sm text-slate-900">
                  Daily Cash Drawer Shift:{" "}
                  <span className={cashDrawer.status === "OPEN" ? "text-emerald-700" : "text-slate-500"}>
                    {cashDrawer.status}
                  </span>
                </h3>
              </div>

              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setActualClosingCount(cashDrawer.expectedCash.toString());
                  setIsDrawerShiftOpen(true);
                }}
                className={`text-xs ${
                  cashDrawer.status === "OPEN" ? "text-red-700 border-red-200 hover:bg-red-50" : "text-emerald-700 border-emerald-200"
                }`}
              >
                {cashDrawer.status === "OPEN" ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" /> End Shift (Z-Reading)
                  </>
                ) : (
                  <>
                    <Unlock className="h-3 w-3 mr-1" /> Open Register Drawer
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Opening Float</span>
                <span className="text-base font-bold text-slate-800">
                  ₱{cashDrawer.openingCash.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block">by {cashDrawer.openedBy}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Cash Sales Today</span>
                <span className="text-base font-bold text-emerald-700">
                  +₱{cashDrawer.cashSales.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block">via POS register</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Cash In / Out</span>
                <span className="text-base font-bold text-slate-800">
                  +₱{cashDrawer.cashIn.toFixed(0)} / -₱{cashDrawer.cashOut.toFixed(0)}
                </span>
                <span className="text-[10px] text-slate-400 block">Debt pays & expenses</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 block font-semibold text-[11px]">Expected Cash in Box</span>
                <span className="text-lg font-extrabold text-slate-900">
                  ₱{cashDrawer.expectedCash.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses KPI Card */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Operating Expenses</span>
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-700 mt-2">
                ₱{totalExpenses.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Recorded across {expenses.length} expense items</p>
            </div>
            <div className="pt-3 border-t text-[11px] text-slate-500 flex justify-between">
              <span>Top Category:</span>
              <span className="font-semibold text-slate-800">Supplier Restock</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense History Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <SearchInput
              placeholder="Search expenses by description, receipt ref, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs sm:text-sm bg-slate-50"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Method</th>
                <th className="p-3">Logged By</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(exp.date).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900">{exp.description}</span>
                    {exp.receiptRef && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Ref: {exp.receiptRef}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {exp.paymentMethod}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{exp.recordedBy}</td>
                  <td className="p-3 text-right font-extrabold text-rose-700 text-sm">
                    -₱{exp.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredExpenses.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No expenses recorded matching your query.
            </div>
          )}
        </div>
      </div>

      {/* LOG EXPENSE DIALOG */}
      {isAddExpenseOpen && (
        <Dialog open={isAddExpenseOpen} onOpenChange={(open) => !open && setIsAddExpenseOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              Record Business Expense
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label htmlFor="exp-category" className="text-xs font-semibold">Expense Category</Label>
              <select
                id="exp-category"
                value={expCat}
                onChange={(e) => setExpCat(e.target.value as any)}
                className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="exp-amount" className="text-xs font-semibold">Amount (₱)</Label>
              <Input
                id="exp-amount"
                type="number"
                step="any"
                required
                min="1"
                placeholder="0.00"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="text-base font-bold h-10 text-rose-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="exp-desc" className="text-xs font-semibold">Description / Purpose</Label>
              <Input
                id="exp-desc"
                required
                placeholder="e.g. Meralco electric bill, Wholesaler restock"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Paid Via</Label>
                <select
                  value={expMethod}
                  onChange={(e) => setExpMethod(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white"
                >
                  <option value="CASH">Cash (From Drawer)</option>
                  <option value="GCASH">GCash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="exp-receipt" className="text-xs">Receipt / Invoice No.</Label>
                <Input
                  id="exp-receipt"
                  placeholder="e.g. OR-99214"
                  value={expReceipt}
                  onChange={(e) => setExpReceipt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Save Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* CASH DRAWER SHIFT DIALOG */}
      {isDrawerShiftOpen && (
        <Dialog open={isDrawerShiftOpen} onOpenChange={(open) => !open && setIsDrawerShiftOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {cashDrawer.status === "OPEN" ? "Close Register Shift (Z-Reading)" : "Open Register Shift"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveDrawerShift} className="space-y-4 text-xs">
            {cashDrawer.status === "OPEN" ? (
              <>
                <div className="p-3 bg-slate-100 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Expected Register Cash:</span>
                    <span className="font-bold text-slate-900">₱{cashDrawer.expectedCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>(Opening + Sales + CashIn - CashOut)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="close-count" className="text-xs font-semibold">
                    Actual Cash Counted in Drawer (₱)
                  </Label>
                  <Input
                    id="close-count"
                    type="number"
                    step="any"
                    required
                    value={actualClosingCount}
                    onChange={(e) => setActualClosingCount(e.target.value)}
                    className="text-base font-bold h-10"
                  />
                </div>

                <div className="p-2.5 rounded-lg border bg-amber-50 border-amber-200 flex justify-between">
                  <span className="text-amber-900">Discrepancy (Over / Short):</span>
                  <span className="font-bold text-amber-950">
                    ₱{((parseFloat(actualClosingCount) || 0) - cashDrawer.expectedCash).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="open-float" className="text-xs font-semibold">
                  Opening Float / Change Money (₱)
                </Label>
                <Input
                  id="open-float"
                  type="number"
                  step="any"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="text-base font-bold h-10 text-emerald-700"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="drawer-notes" className="text-xs">Shift Notes</Label>
              <Input
                id="drawer-notes"
                placeholder="e.g. Morning shift with ₱20 coins ready"
                value={drawerNotes}
                onChange={(e) => setDrawerNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDrawerShiftOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white font-semibold">
                {cashDrawer.status === "OPEN" ? "Finalize & Close Shift" : "Start Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* CASH IN / OUT ADJUSTMENT DIALOG */}
      {isCashAdjustOpen && (
        <Dialog open={isCashAdjustOpen} onOpenChange={(open) => !open && setIsCashAdjustOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Register Cash In / Cash Out</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustType === "IN" ? "default" : "outline"}
                className={`text-xs h-9 ${adjustType === "IN" ? "bg-emerald-600 text-white" : ""}`}
                onClick={() => setAdjustType("IN")}
              >
                <ArrowDownLeft className="h-4 w-4 mr-1.5" /> Cash In (Add money)
              </Button>
              <Button
                type="button"
                variant={adjustType === "OUT" ? "default" : "outline"}
                className={`text-xs h-9 ${adjustType === "OUT" ? "bg-rose-600 text-white" : ""}`}
                onClick={() => setAdjustType("OUT")}
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Cash Out (Take money)
              </Button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="adj-amount" className="text-xs font-semibold">Amount (₱)</Label>
              <Input
                id="adj-amount"
                type="number"
                step="any"
                required
                min="1"
                placeholder="0.00"
                value={adjustAmt}
                onChange={(e) => setAdjustAmt(e.target.value)}
                className="text-base font-bold h-10"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="adj-reason" className="text-xs font-semibold">Reason</Label>
              <Input
                id="adj-reason"
                required
                placeholder="e.g. Added ₱500 coins from bank, or owner personal cash withdrawal"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCashAdjustOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white font-semibold">
                Apply Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
