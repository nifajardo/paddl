"use client";

import React from "react";
import { printDocument } from "@/lib/printing";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, Share2 } from "lucide-react";
import { StoreSettings } from "@/types";

interface DebtReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  cashierName: string;
  receiptData: {
    receiptNo: string;
    customerName: string;
    amountPaid: number;
    paymentMethod: string;
    remainingDebt: number;
    date: string;
    notes?: string;
  } | null;
}

export function DebtReceiptModal({
  isOpen,
  onClose,
  settings,
  cashierName,
  receiptData,
}: DebtReceiptModalProps) {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    printDocument("#printable-debt-receipt", `Payment ${receiptData.receiptNo}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader className="text-center">
          <div className="mx-auto h-11 w-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-bold text-center">
            Utang Payment Received
          </DialogTitle>
          <p className="text-xs text-slate-500 text-center">
            Collection acknowledgment slip
          </p>
        </DialogHeader>

        {/* 58mm Receipt Preview */}
        <div id="printable-debt-receipt" className="print-receipt bg-amber-50/20 border border-slate-300 rounded-xl p-4 font-mono text-xs text-slate-800 space-y-2.5">
          <div className="text-center border-b border-dashed border-slate-300 pb-2">
            <h3 className="font-extrabold text-sm uppercase text-slate-900">{settings.storeName}</h3>
            <p className="text-[10px] text-slate-500">{settings.address}</p>
            <p className="text-[10px] text-slate-500 font-bold">ACK RECEIPT: {receiptData.receiptNo}</p>
            <p className="text-[10px] text-slate-400">
              {new Date(receiptData.date).toLocaleString("en-PH")}
            </p>
          </div>

          <div className="space-y-1.5 py-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{receiptData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-bold uppercase">{receiptData.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-b border-slate-200 py-1 my-1">
              <span>AMOUNT PAID:</span>
              <span className="text-emerald-700">₱{receiptData.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Remaining Utang:</span>
              <span className="font-extrabold text-amber-800">
                ₱{receiptData.remainingDebt.toFixed(2)}
              </span>
            </div>
            {receiptData.notes && (
              <div className="text-[11px] text-slate-500 italic pt-1">
                Note: {receiptData.notes}
              </div>
            )}
          </div>

          <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
            <p>Collected by: {cashierName}</p>
            <p className="font-sans italic">Maraming salamat po sa pagbabayad!</p>
          </div>
        </div>

        <DialogFooter className="pt-2 flex justify-between items-center sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
