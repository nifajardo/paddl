"use client";

import React, { useState } from "react";
import { Transaction } from "@/types";
import { useStore } from "@/context/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Ban, Lock, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sounds";

interface VoidTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}

const COMMON_VOID_REASONS = [
  "Customer changed mind / canceled order",
  "Cashier ringing error / wrong items punched",
  "Duplicate receipt entered by mistake",
  "Payment failure / declined card / fake e-wallet slip",
  "Incorrect pricing or discount applied",
  "Other reason (specify below)",
];

export function VoidTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: VoidTransactionModalProps) {
  const { voidTransaction, currentStaff, verifyOwnerPin, hasPermission } = useStore();

  const [selectedReason, setSelectedReason] = useState(COMMON_VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !transaction) return null;

  const requiresPin = !hasPermission("canVoidTransactions");
  const finalReason = selectedReason === "Other reason (specify below)" ? customReason.trim() : selectedReason;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!finalReason) {
      toast.error("Please provide a reason for voiding this transaction.");
      return;
    }

    if (requiresPin) {
      if (!pin.trim()) {
        setPinError("Owner/Manager PIN is required for Cashiers to void transactions.");
        return;
      }
      if (!verifyOwnerPin(pin)) {
        setPinError("Incorrect Owner PIN. Authorization denied.");
        sound.error?.();
        return;
      }
    }

    setIsConfirmStep(true);
  };

  const handleExecuteVoid = () => {
    setIsProcessing(true);
    try {
      const result = voidTransaction({
        transactionId: transaction.id,
        reason: finalReason,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        sound.click?.();
        toast.success(`Transaction ${transaction.receiptNumber} successfully VOIDED. Stock restored.`);
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        toast.error(result.error || "Failed to void transaction.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsConfirmStep(false);
    setPin("");
    setPinError("");
    setNotes("");
    setCustomReason("");
    setSelectedReason(COMMON_VOID_REASONS[0]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6 bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-700">
            <div className="p-2 rounded-full bg-rose-100">
              <Ban className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isConfirmStep ? "Confirm Transaction Void" : "Void / Cancel Completed Sale"}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Receipt #{transaction.receiptNumber} • ₱{transaction.total.toFixed(2)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {!isConfirmStep ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4 text-xs pt-1">
            {/* Warning Card */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed">
                <strong className="block font-semibold">Financial & Stock Impact:</strong>
                Voiding will restore all items ({transaction.items.reduce((s, i) => s + i.quantity, 0)} units) back to store inventory and reverse the revenue impact. This action is permanently recorded in the audit trail.
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between font-semibold text-slate-700 text-[11px] border-b pb-1">
                <span>Items in Transaction:</span>
                <span>Qty x Price</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600 text-[11px]">
                    <span className="truncate max-w-[220px]">{item.product.name}</span>
                    <span className="font-mono">{item.quantity} x ₱{item.product.sellingPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t text-xs">
                <span>Total Refunded / Reversed:</span>
                <span className="text-rose-600">₱{transaction.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Required Reason for Void <span className="text-rose-500">*</span>
              </Label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {COMMON_VOID_REASONS.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {selectedReason === "Other reason (specify below)" && (
                <Input
                  required
                  placeholder="Specify reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="text-xs mt-1"
                />
              )}
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Internal Audit Notes (Optional)</Label>
              <Input
                placeholder="e.g. Authorized by Manager, customer cash handed back..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Cashier PIN Gate */}
            {requiresPin && (
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-purple-600" />
                  Owner / Manager Master PIN Authorization
                </Label>
                <Input
                  type="password"
                  maxLength={6}
                  placeholder="Enter owner PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPinError("");
                  }}
                  className="text-xs font-mono tracking-widest text-center h-9 font-bold"
                />
                {pinError && <p className="text-[11px] font-semibold text-rose-600">{pinError}</p>}
              </div>
            )}

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">
                Proceed to Void
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-center space-y-2">
              <Ban className="h-8 w-8 text-rose-600 mx-auto" />
              <h4 className="font-bold text-sm text-rose-950">Are you absolutely sure?</h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                You are about to void transaction <span className="font-mono font-bold text-slate-900">{transaction.receiptNumber}</span>. 
                <br />
                The sale total of <strong className="text-rose-700">₱{transaction.total.toFixed(2)}</strong> will be reversed and {transaction.items.length} product(s) will be restocked.
              </p>
              <div className="p-2 bg-white rounded border border-rose-100 text-left text-[11px] space-y-0.5">
                <div><span className="text-slate-500">Reason:</span> <strong>{finalReason}</strong></div>
                <div><span className="text-slate-500">Processed by:</span> <strong>{currentStaff.name}</strong></div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmStep(false)}
                disabled={isProcessing}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteVoid}
                disabled={isProcessing}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {isProcessing ? "Voiding..." : "Yes, Permanently Void Sale"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
