"use client";

import React from "react";
import { StoreSettings, CashDrawerShift, Transaction, Expense } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, ShieldCheck, CheckCircle2 } from "lucide-react";

interface ZReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  cashDrawer: CashDrawerShift;
  cashierName: string;
  transactions: Transaction[];
  expenses: Expense[];
  grossSales: number;
  totalDiscount: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  paymentBreakdown: Record<string, number>;
}

export function ZReadingModal({
  isOpen,
  onClose,
  settings,
  cashDrawer,
  cashierName,
  transactions,
  grossSales,
  totalDiscount,
  cogs,
  grossProfit,
  operatingExpenses,
  netProfit,
  paymentBreakdown,
}: ZReadingModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const netSales = transactions.filter(t => !["VOID", "VOIDED"].includes(t.status)).reduce((sum, t) => sum + t.total - (t.refundedAmount || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="h-5 w-5 text-indigo-600" />
              Sales summary
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500">
            Management summary for the selected sales period. Not a fiscal Z-reading.
          </p>
        </DialogHeader>

        {/* 58mm Thermal Receipt Printable Simulation */}
        <div className="print-receipt bg-amber-50/20 border border-slate-300 rounded-xl p-5 font-mono text-xs text-slate-800 shadow-inner space-y-3">
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-3">
            <h2 className="font-extrabold text-sm uppercase text-slate-900">{settings.storeName}</h2>
            <p className="text-[10px] text-slate-600">{settings.address}</p>
            <p className="text-[10px] text-slate-600">Contact: {settings.phone}</p>
            {settings.tinNumber && (
              <p className="text-[10px] text-slate-600 font-bold">TIN: {settings.tinNumber}</p>
            )}
            <div className="pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-950">
              *** DAILY Z-READING SLIP ***
            </div>
            <div className="text-[10px] text-slate-500">
              Date: {currentDate} {currentTime}
            </div>
            <div className="text-[10px] text-slate-500">
              Terminal: POS-01 | Cashier: {cashierName}
            </div>
          </div>

          {/* Sales & Discounts */}
          <div className="space-y-1 py-1 border-b border-dashed border-slate-400 text-[11px]">
            <div className="flex justify-between">
              <span>Gross Sales ({transactions.length} orders):</span>
              <span className="font-bold">₱{grossSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Demo discount &amp; Discounts:</span>
              <span>-₱{totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-0.5 border-t border-slate-200">
              <span>NET SALES:</span>
              <span className="text-slate-900 font-extrabold">₱{netSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Cost of Goods Sold (COGS):</span>
              <span>-₱{cogs.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>GROSS PROFIT:</span>
              <span className="text-emerald-700">₱{grossProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>Operating Expenses:</span>
              <span>-₱{operatingExpenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-300">
              <span>NET TAKE-HOME PROFIT:</span>
              <span className="text-emerald-800">₱{netProfit.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="space-y-1 py-1 border-b border-dashed border-slate-400 text-[11px]">
            <div className="font-bold uppercase text-[10px] text-slate-500 mb-0.5">Tender Breakdown:</div>
            <div className="flex justify-between">
              <span>Cash Sales:</span>
              <span>₱{(paymentBreakdown["CASH"] || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GCash (QR Ph):</span>
              <span>₱{(paymentBreakdown["GCASH"] || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Maya:</span>
              <span>₱{(paymentBreakdown["MAYA"] || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Credit / Utang:</span>
              <span>₱{(paymentBreakdown["CREDIT_UTANG"] || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Cash Drawer Status */}
          <div className="space-y-1 py-1 text-[11px]">
            <div className="font-bold uppercase text-[10px] text-slate-500 mb-0.5">Cash Drawer Balance:</div>
            <div className="flex justify-between text-slate-600">
              <span>Opening Float:</span>
              <span>₱{cashDrawer.openingCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Expected Cash in Box:</span>
              <span className="text-slate-900 font-mono">₱{cashDrawer.expectedCash.toFixed(2)}</span>
            </div>
            {cashDrawer.actualCash !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Actual Cash Counted:</span>
                  <span>₱{cashDrawer.actualCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Cash Discrepancy:</span>
                  <span className={cashDrawer.discrepancy && cashDrawer.discrepancy < 0 ? "text-rose-600" : "text-emerald-600"}>
                    {cashDrawer.discrepancy && cashDrawer.discrepancy < 0 ? "Short " : "Over "}
                    ₱{Math.abs(cashDrawer.discrepancy || 0).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Signatures & Footer */}
          <div className="pt-3 border-t border-dashed border-slate-400 text-center space-y-4">
            <div className="flex justify-between text-[10px] pt-4">
              <div className="border-t border-slate-400 w-28 pt-1">Cashier Signature</div>
              <div className="border-t border-slate-400 w-28 pt-1">Owner Signature</div>
            </div>
            <div className="text-[9px] text-slate-400">
              Powered by Paddl Plus • Idempotent Audit Engine
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 flex justify-between items-center sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Print Z-Reading (58mm)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
