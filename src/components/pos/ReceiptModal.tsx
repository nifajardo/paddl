"use client";

import React, { useRef } from "react";
import { Transaction, StoreSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Printer, Share2, CheckCircle2, Copy } from "lucide-react";

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ transaction, settings, isOpen, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textReceipt = `
================================
${settings.storeName.toUpperCase()}
${settings.address}
Tel: ${settings.phone}
================================
Official Receipt: ${transaction.receiptNumber}
Date: ${new Date(transaction.createdAt).toLocaleString()}
Cashier: ${transaction.cashierName}
Payment: ${transaction.paymentMethod}
${transaction.customerName ? `Customer: ${transaction.customerName}\n` : ""}
--------------------------------
${transaction.items
  .map(
    (i) =>
      `${i.product.name.slice(0, 20)}\n  ${i.quantity} x ₱${i.product.sellingPrice.toFixed(
        2
      )} = ₱${i.subtotal.toFixed(2)}`
  )
  .join("\n")}
--------------------------------
Subtotal:       ₱${transaction.subtotal.toFixed(2)}
${
  transaction.discountAmount > 0
    ? `Discount:       -₱${transaction.discountAmount.toFixed(2)}\n`
    : ""
}TOTAL:          ₱${transaction.total.toFixed(2)}
Tendered:       ₱${transaction.amountTendered.toFixed(2)}
Change:         ₱${transaction.changeDue.toFixed(2)}
================================
${settings.receiptFooterMessage}
================================
    `.trim();

    navigator.clipboard.writeText(textReceipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Transaction Complete
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Thermal Receipt Visual Preview (58mm style) */}
        <div
          ref={receiptRef}
          className="print-receipt my-2 p-5 bg-white border border-dashed border-gray-300 rounded-lg font-mono text-xs text-gray-800 shadow-inner select-text"
        >
          <div className="text-center space-y-0.5 mb-3 border-b border-gray-300 pb-3">
            <h3 className="font-bold text-sm tracking-wide text-gray-950 uppercase">
              {settings.storeName}
            </h3>
            <p className="text-[11px] text-gray-600">{settings.tagline}</p>
            <p className="text-[10px] text-gray-500">{settings.address}</p>
            <p className="text-[10px] text-gray-500">Contact: {settings.phone}</p>
            {settings.tinNumber && (
              <p className="text-[10px] text-gray-400">TIN: {settings.tinNumber}</p>
            )}
          </div>

          <div className="space-y-1 mb-3 text-[11px] border-b border-gray-200 pb-2">
            <div className="flex justify-between">
              <span className="text-gray-500">OR No:</span>
              <span className="font-semibold">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date/Time:</span>
              <span>{new Date(transaction.createdAt).toLocaleString("en-PH")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cashier:</span>
              <span>{transaction.cashierName}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-semibold text-blue-700">{transaction.customerName}</span>
              </div>
            )}
            {transaction.isBackdated && (
              <div className="text-[10px] text-amber-600 italic">
                * Backdated Entry logged
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2 mb-3 border-b border-gray-200 pb-3">
            <div className="flex justify-between font-bold text-[10px] text-gray-500 border-b border-gray-100 pb-1 uppercase">
              <span>Item & Qty</span>
              <span>Total</span>
            </div>
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span className="truncate max-w-[200px]">{item.product.name}</span>
                  <span>₱{item.subtotal.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {item.quantity} {item.product.unit || "pcs"} @ ₱{item.product.sellingPrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-xs mb-3 border-b border-gray-200 pb-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>₱{transaction.subtotal.toFixed(2)}</span>
            </div>
            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount ({transaction.discountType === "SENIOR_PWD_20" ? "Senior/PWD 20%" : "Promo"}):</span>
                <span>-₱{transaction.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-gray-950 pt-1 border-t border-gray-200">
              <span>TOTAL DUE:</span>
              <span>₱{transaction.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-1 text-xs mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method:</span>
              <span className="font-bold uppercase tracking-wider">{transaction.paymentMethod}</span>
            </div>
            {transaction.ewalletRefNumber && (
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Ref No:</span>
                <span className="font-mono">{transaction.ewalletRefNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Tendered:</span>
              <span>₱{transaction.amountTendered.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-emerald-700">
              <span>Change Due:</span>
              <span>₱{transaction.changeDue.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-dashed border-gray-300 space-y-1">
            <p className="text-[11px] text-gray-600 font-sans italic">{settings.receiptFooterMessage}</p>
            <p className="text-[9px] text-gray-400">Powered by Peddlr Plus Enterprise</p>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 justify-end sm:justify-end">
          <Button variant="outline" size="sm" onClick={handleCopyText} className="gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy E-Receipt"}
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            <Printer className="h-3.5 w-3.5" />
            Print (58mm/80mm)
          </Button>
          <Button variant="default" size="sm" onClick={onClose} className="text-xs">
            New Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
