"use client";

import React, { useRef } from "react";
import { Transaction, StoreSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Printer, Copy, CheckCircle2, AlertOctagon, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  isCopy?: boolean; // When printing from Transaction History
}

export function ReceiptModal({
  transaction,
  settings,
  isOpen,
  onClose,
  isCopy = false,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    // Add print class to body temporarily or trigger browser print
    window.print();
  };

  const handleCopyText = () => {
    const textReceipt = `
================================
${settings.storeName.toUpperCase()}
${settings.tagline}
${settings.address}
Tel: ${settings.phone}
${settings.tinNumber ? `TIN: ${settings.tinNumber}\n` : ""}================================
${isCopy ? "*** DUPLICATE COPY / REPRINT ***\n" : ""}Acknowledgment Receipt: ${transaction.receiptNumber}
Status: ${transaction.status}
Date: ${new Date(transaction.createdAt).toLocaleString("en-PH")}
Cashier: ${transaction.cashierName}
Payment: ${transaction.paymentMethod}
${transaction.customerName ? `Customer: ${transaction.customerName}\n` : ""}--------------------------------
${transaction.items
  .map(
    (i) =>
      `${i.product.name.slice(0, 24)}\n  ${i.quantity} ${i.product.unit || "pcs"} x ₱${i.product.sellingPrice.toFixed(
        2
      )} = ₱${i.subtotal.toFixed(2)}`
  )
  .join("\n")}
--------------------------------
Subtotal:       ₱${transaction.subtotal.toFixed(2)}
${
  transaction.discountAmount > 0
    ? `Discount:       -₱${transaction.discountAmount.toFixed(2)} (${
        transaction.discountType === "SENIOR_PWD_20" ? "20% demo discount" : "Promo"
      })\n`
    : ""
}${
  settings.taxEnabled
    ? `VAT (${settings.taxRate}%):   ₱${(
        (transaction.total * settings.taxRate) /
        (100 + settings.taxRate)
      ).toFixed(2)}\n`
    : ""
}TOTAL AMOUNT:   ₱${transaction.total.toFixed(2)}
Tendered:       ₱${transaction.amountTendered.toFixed(2)}
Change:         ₱${transaction.changeDue.toFixed(2)}
${
  transaction.splitDetail
    ? `Split: Cash ₱${transaction.splitDetail.cashAmount.toFixed(2)} + ${
        transaction.splitDetail.digitalMethod
      } ₱${transaction.splitDetail.digitalAmount.toFixed(2)}\n`
    : ""
}${transaction.ewalletRefNumber ? `Ref No: ${transaction.ewalletRefNumber}\n` : ""}================================
${settings.receiptFooterMessage}
================================
    `.trim();

    navigator.clipboard.writeText(textReceipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVoided = transaction.status === "VOIDED" || transaction.status === "VOID";
  const isReturned = transaction.status === "REFUNDED" || transaction.status === "PARTIALLY_RETURNED";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 max-h-[92vh] overflow-y-auto bg-white print:p-0 print:m-0 print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-base">
              {isCopy ? (
                <>
                  <Printer className="h-5 w-5 text-indigo-600" />
                  <span>Reprint Receipt Copy</span>
                </>
              ) : isVoided ? (
                <>
                  <AlertOctagon className="h-5 w-5 text-rose-600" />
                  <span className="text-rose-700">Voided Transaction Receipt</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-emerald-800">Transaction Complete</span>
                </>
              )}
            </DialogTitle>
            {isCopy && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold uppercase">
                Duplicate Copy
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* 58mm / 80mm Standard Thermal Slip Layout */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className="print-receipt my-2 p-5 bg-white border border-dashed border-slate-300 rounded-lg font-mono text-xs text-slate-800 shadow-inner select-text"
        >
          {/* Duplicate Copy Notice */}
          {isCopy && (
            <div className="text-center font-bold text-xs uppercase tracking-widest border-2 border-slate-900 py-1 mb-2.5 bg-slate-100">
              *** COPY OF RECEIPT ***
            </div>
          )}

          {/* Void / Refunded Status Watermark Banner */}
          {isVoided && (
            <div className="text-center font-bold text-xs uppercase tracking-widest border-2 border-rose-600 text-rose-700 py-1 mb-2.5 bg-rose-50">
              *** VOIDED TRANSACTION ***
              {transaction.voidReason && (
                <div className="text-[10px] font-normal normal-case mt-0.5">Reason: {transaction.voidReason}</div>
              )}
            </div>
          )}

          {isReturned && (
            <div className="text-center font-bold text-xs uppercase tracking-widest border-2 border-amber-600 text-amber-800 py-1 mb-2.5 bg-amber-50">
              *** {transaction.status === "REFUNDED" ? "FULLY REFUNDED" : "PARTIALLY RETURNED"} ***
              {transaction.refundedAmount && (
                <div className="text-[10px] font-normal mt-0.5">
                  Refunded: ₱{transaction.refundedAmount.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Store Header */}
          <div className="text-center space-y-0.5 mb-3 border-b border-slate-300 pb-3">
            <h3 className="font-bold text-sm tracking-wide text-slate-950 uppercase font-sans">
              {settings.storeName}
            </h3>
            {settings.tagline && <p className="text-[11px] text-slate-600 font-sans">{settings.tagline}</p>}
            <p className="text-[10px] text-slate-500 font-sans">{settings.address}</p>
            <p className="text-[10px] text-slate-500 font-sans">Contact: {settings.phone}</p>
            {settings.tinNumber && (
              <p className="text-[10px] text-slate-400 font-mono">TIN: {settings.tinNumber}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1 mb-3 text-[11px] border-b border-slate-200 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt number:</span>
              <span className="font-semibold font-mono">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date / Time:</span>
              <span>{new Date(transaction.createdAt).toLocaleString("en-PH")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{transaction.cashierName}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-blue-700">{transaction.customerName}</span>
              </div>
            )}
            {transaction.isBackdated && (
              <div className="text-[10px] text-amber-600 italic">
                * Backdated Entry logged
              </div>
            )}
          </div>

          {/* Purchased Items Table */}
          <div className="space-y-2 mb-3 border-b border-slate-200 pb-3">
            <div className="flex justify-between font-bold text-[10px] text-slate-500 border-b border-slate-200 pb-1 uppercase tracking-wider">
              <span>Item & Quantity</span>
              <span>Total</span>
            </div>
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span className="truncate max-w-[200px]">{item.product.name}</span>
                  <span className="font-mono">₱{item.subtotal.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>
                    {item.quantity} {item.product.unit || "pcs"} @ ₱{item.product.sellingPrice.toFixed(2)}
                  </span>
                  {item.product.barcode && (
                    <span className="text-[9px] text-slate-400 font-mono">#{item.product.barcode}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Discounts */}
          <div className="space-y-1.5 text-xs mb-3 border-b border-slate-200 pb-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₱{transaction.subtotal.toFixed(2)}</span>
            </div>

            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>
                  Discount ({transaction.discountType === "SENIOR_PWD_20" ? "20% demo discount" : "Promo"}):
                </span>
                <span className="font-mono">-₱{transaction.discountAmount.toFixed(2)}</span>
              </div>
            )}

            {settings.taxEnabled && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>VAT ({settings.taxRate}% Included):</span>
                <span className="font-mono">
                  ₱{((transaction.total * settings.taxRate) / (100 + settings.taxRate)).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t border-slate-300">
              <span>TOTAL DUE:</span>
              <span className="font-mono">₱{transaction.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Tender & Payment Breakdown */}
          <div className="space-y-1 text-xs mb-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Tender:</span>
              <span className="font-bold uppercase tracking-wider">{transaction.paymentMethod}</span>
            </div>

            {transaction.paymentMethod === "SPLIT" && transaction.splitDetail && (
              <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-0.5 my-1">
                <div className="flex justify-between">
                  <span>Cash Portion:</span>
                  <span className="font-mono">₱{transaction.splitDetail.cashAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{transaction.splitDetail.digitalMethod} Portion:</span>
                  <span className="font-mono">₱{transaction.splitDetail.digitalAmount.toFixed(2)}</span>
                </div>
                {transaction.splitDetail.digitalRefNumber && (
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Digital Ref:</span>
                    <span className="font-mono">{transaction.splitDetail.digitalRefNumber}</span>
                  </div>
                )}
              </div>
            )}

            {transaction.ewalletRefNumber && (
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Ref / Trace No:</span>
                <span className="font-mono font-semibold">{transaction.ewalletRefNumber}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-500">Amount Tendered:</span>
              <span className="font-mono">₱{transaction.amountTendered.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-semibold text-emerald-700">
              <span>Change Due:</span>
              <span className="font-mono">₱{transaction.changeDue.toFixed(2)}</span>
            </div>
          </div>

          {/* Barcode representation */}
          <div className="text-center pt-2 border-t border-dashed border-slate-300 space-y-1">
            <div className="font-mono tracking-widest text-[9px] text-slate-400">
              ||||| ||| ||||||| |||| || |||||||| ||||
            </div>
            <p className="text-[10px] font-mono text-slate-500">*{transaction.receiptNumber}*</p>
            <p className="text-[11px] text-slate-600 font-sans italic pt-1">{settings.receiptFooterMessage}</p>
            <p className="text-[9px] text-slate-400 font-sans">Paddl · Acknowledgment only, not a tax invoice</p>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-row gap-2 justify-end sm:justify-end print:hidden">
          <Button variant="outline" size="sm" onClick={handleCopyText} className="gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy E-Receipt"}
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Receipt
          </Button>
          <Button variant="default" size="sm" onClick={onClose} className="text-xs">
            {isCopy ? "Close" : "New Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
