"use client";

import React, { useState, useMemo } from "react";
import { Transaction, Product } from "@/types";
import { useStore } from "@/context/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Undo2, AlertTriangle, CheckCircle2, Lock, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { calculateReturn } from "@/lib/commerce";
import { sound } from "@/lib/sounds";

interface ReturnRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}

const COMMON_RETURN_REASONS = [
  "Defective / Damaged product packaging",
  "Expired / Near-expiry item discovered",
  "Customer bought wrong brand or flavor",
  "Customer change of mind (within policy)",
  "Wrong quantity or overcharged at counter",
  "Other reason (specify below)",
];

export function ReturnRefundModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: ReturnRefundModalProps) {
  const { processReturn, currentStaff, verifyOwnerPin } = useStore();

  // Selected quantities to return per product ID
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [selectedReason, setSelectedReason] = useState(COMMON_RETURN_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restock, setRestock] = useState(false);

  // Calculate previously returned quantities for each item
  const previouslyReturnedMap = useMemo(() => {
    if (!transaction) return {};
    const map: Record<string, number> = {};
    (transaction.returnHistory || []).forEach((r) => {
      r.returnedItems.forEach((ri) => {
        map[ri.productId] = (map[ri.productId] || 0) + ri.quantity;
      });
    });
    return map;
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const requiresPin = currentStaff.role === "CASHIER";
  const finalReason = selectedReason === "Other reason (specify below)" ? customReason.trim() : selectedReason;

  // Max returnable quantity per item
  const getItemMaxReturnable = (productId: string, originalQty: number) => {
    const alreadyReturned = previouslyReturnedMap[productId] || 0;
    return Math.max(0, originalQty - alreadyReturned);
  };

  const handleQtyChange = (productId: string, qty: number, max: number) => {
    const validQty = Math.max(0, Math.min(max, qty));
    setReturnQuantities((prev) => ({
      ...prev,
      [productId]: validQty,
    }));
  };

  const handleSelectAll = () => {
    const all: Record<string, number> = {};
    transaction.items.forEach((item) => {
      const max = getItemMaxReturnable(item.product.id, item.quantity);
      all[item.product.id] = max;
    });
    setReturnQuantities(all);
  };

  const handleClearSelection = () => {
    setReturnQuantities({});
  };

  // Compute calculated refund amount
  const computedRefundTotal = (() => {
    const requested = Object.entries(returnQuantities).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity }));
    if (!requested.length) return 0;
    try { return calculateReturn(transaction, requested).reduce((sum, item) => sum + item.refundAmount, 0); } catch { return 0; }
  })();

  const totalItemsToReturn = Object.values(returnQuantities).reduce((a, b) => a + b, 0);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (totalItemsToReturn === 0) {
      toast.error("Please specify at least 1 item quantity to return.");
      return;
    }

    if (!finalReason) {
      toast.error("Please provide a reason for the return / refund.");
      return;
    }

    if (requiresPin) {
      if (!pin.trim()) {
        setPinError("Owner/Manager PIN is required for Cashiers to process returns.");
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

  const handleExecuteReturn = () => {
    setIsProcessing(true);
    try {
      const itemsPayload = Object.entries(returnQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));

      const result = processReturn({
        transactionId: transaction.id,
        returnedItems: itemsPayload,
        restock,
        reason: finalReason,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        sound.click?.();
        toast.success(
          `Processed return for ${itemsPayload.length} item(s). Refund amount: ₱${computedRefundTotal.toFixed(2)}`
        );
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        toast.error(result.error || "Failed to process return.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsConfirmStep(false);
    setReturnQuantities({});
    setPin("");
    setPinError("");
    setNotes("");
    setCustomReason("");
    setSelectedReason(COMMON_RETURN_REASONS[0]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-6 bg-white max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-700">
            <div className="p-2 rounded-full bg-indigo-100">
              <Undo2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isConfirmStep ? "Confirm Return & Refund" : "Process Item Return / Refund"}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Receipt #{transaction.receiptNumber} • Original Total: ₱{transaction.total.toFixed(2)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {!isConfirmStep ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4 text-xs pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Select items & return quantities:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Return Entire Order
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Items List with Quantity Spinners */}
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
              {transaction.items.map((item) => {
                const max = getItemMaxReturnable(item.product.id, item.quantity);
                const currentQty = returnQuantities[item.product.id] || 0;
                const isFullyReturned = max === 0;

                return (
                  <div key={item.product.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 truncate">{item.product.name}</span>
                        {isFullyReturned && (
                          <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-500">
                            Already Returned
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Bought: {item.quantity} {item.product.unit || "pcs"} • Max Returnable:{" "}
                        <strong className="text-slate-700">{max}</strong> • ₱{item.product.sellingPrice.toFixed(2)} ea
                      </p>
                    </div>

                    {!isFullyReturned ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          onClick={() => handleQtyChange(item.product.id, currentQty - 1, max)}
                          disabled={currentQty <= 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={max}
                          value={currentQty}
                          onChange={(e) =>
                            handleQtyChange(item.product.id, parseInt(e.target.value) || 0, max)
                          }
                          className="w-12 h-7 text-center font-bold text-xs p-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          onClick={() => handleQtyChange(item.product.id, currentQty + 1, max)}
                          disabled={currentQty >= max}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No remaining units</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calculated Refund Summary */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-950 font-semibold block">
                  Items to Return: {totalItemsToReturn} unit(s)
                </span>
                <span className="text-[11px] text-indigo-700">
                  {restock ? "Sellable items will return to inventory" : "Items will stay out of sellable inventory"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Estimated Refund</span>
                <span className="text-base font-bold text-indigo-700 font-mono">
                  ₱{computedRefundTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Return Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Reason for Return / Refund <span className="text-rose-500">*</span>
              </Label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {COMMON_RETURN_REASONS.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {selectedReason === "Other reason (specify below)" && (
                <Input
                  required
                  placeholder="Specify return reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="text-xs mt-1"
                />
              )}
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="flex items-start gap-2 mb-4 text-xs"><input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} /> Return these items to sellable stock (only if undamaged and unexpired)</label>
              <Label className="text-xs font-semibold text-slate-700">Audit Notes (Optional)</Label>
              <Input
                placeholder="e.g. Customer brought physical receipt, items inspected in good order..."
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
                  maxLength={4}
                  placeholder="Enter 4-digit PIN (default 1234)"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
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
              <Button
                type="submit"
                size="sm"
                disabled={totalItemsToReturn === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Review Refund (₱{computedRefundTotal.toFixed(2)})
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center space-y-2">
              <Undo2 className="h-8 w-8 text-indigo-600 mx-auto" />
              <h4 className="font-bold text-sm text-indigo-950">Confirm Refund Payout</h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                You are about to process a refund of{" "}
                <strong className="text-indigo-700 text-sm font-mono font-bold">
                  ₱{computedRefundTotal.toFixed(2)}
                </strong>{" "}
                for {totalItemsToReturn} item(s) on receipt{" "}
                <span className="font-mono font-bold text-slate-900">{transaction.receiptNumber}</span>.
              </p>
              <div className="p-2.5 bg-white rounded border border-indigo-100 text-left text-[11px] space-y-1">
                <div><span className="text-slate-500">Reason:</span> <strong>{finalReason}</strong></div>
                <div><span className="text-slate-500">Original Tender:</span> <strong>{transaction.paymentMethod}</strong></div>
                <div><span className="text-slate-500">Cashier:</span> <strong>{currentStaff.name}</strong></div>
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
                onClick={handleExecuteReturn}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                {isProcessing ? "Processing Refund..." : `Confirm & Issue ₱${computedRefundTotal.toFixed(2)}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
