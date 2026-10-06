"use client";

import React, { useState, useMemo } from "react";
import { Product } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Copy, Printer, Check, CheckSquare, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface RestockSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  storeName: string;
}

export function RestockSheetModal({
  isOpen,
  onClose,
  products,
  storeName,
}: RestockSheetModalProps) {
  const [copied, setCopied] = useState(false);

  // Filter items that need restock
  const restockItems = useMemo(() => {
    return products
      .filter((p) => p.stock <= p.minStockAlert && p.isActive)
      .map((p) => {
        // Suggested restock quantity: 2x minStock minus current stock, minimum 10 pcs
        const targetStock = Math.max(p.minStockAlert * 2, 20);
        const suggestedQty = Math.max(1, targetStock - p.stock);
        const estCost = suggestedQty * p.costPrice;
        return {
          product: p,
          suggestedQty,
          estCost,
        };
      })
      .sort((a, b) => b.estCost - a.estCost);
  }, [products]);

  const totalCapitalRequired = useMemo(() => {
    return restockItems.reduce((sum, item) => sum + item.estCost, 0);
  }, [restockItems]);

  const totalUnitsToBuy = useMemo(() => {
    return restockItems.reduce((sum, item) => sum + item.suggestedQty, 0);
  }, [restockItems]);

  if (!isOpen) return null;

  // Format shopping list for Messenger / SMS
  const formatShoppingList = () => {
    const dateStr = new Date().toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    let text = `🛒 WHOLESALER RESTOCK LIST\n🏪 ${storeName}\n📅 ${dateStr}\n━━━━━━━━━━━━━━━━━━\n`;

    restockItems.forEach((item, index) => {
      text += `${index + 1}. [ ] ${item.product.name} (${item.product.emoji})\n`;
      text += `   Buy: ${item.suggestedQty} ${item.product.unit || "pcs"} (~₱${item.estCost.toFixed(2)})\n`;
      text += `   Current Stock: ${item.product.stock} left\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━\nTotal Items: ${restockItems.length} SKUs (${totalUnitsToBuy} pcs)\nEstimated Capital: ₱${totalCapitalRequired.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nGenerated via Paddl Plus`;
    return text;
  };

  const handleCopyList = () => {
    navigator.clipboard.writeText(formatShoppingList());
    setCopied(true);
    toast.success("Wholesaler shopping list copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Wholesaler Restock Shopping Sheet
            </DialogTitle>
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 font-bold">
              {restockItems.length} SKUs Need Restock
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Automated restock calculation for your trip to Puregold, DALI, or Divisoria wholesale market.
          </p>
        </DialogHeader>

        {/* Capital Budget Summary Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Capital Budget Needed:</span>
            <div className="text-2xl font-black text-emerald-400">
              ₱{totalCapitalRequired.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400">
              For {totalUnitsToBuy} total units across {restockItems.length} low-stock products
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={handleCopyList}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
            >
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copied ? "Copied!" : "Copy for Messenger"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-750 text-xs h-9"
            >
              <Printer className="h-4 w-4 mr-1.5" /> Print Checklist
            </Button>
          </div>
        </div>

        {/* Restock Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3 text-center">Current Stock</th>
                <th className="p-3 text-center">Recommended Qty</th>
                <th className="p-3 text-right">Wholesale Cost (₱)</th>
                <th className="p-3 text-right">Est. Outlay (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {restockItems.map(({ product, suggestedQty, estCost }) => (
                <tr key={product.id} className="hover:bg-amber-50/40 transition">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{product.emoji}</span>
                      <div>
                        <span className="font-semibold text-slate-900 block">{product.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{product.barcode}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={product.stock <= 0 ? "destructive" : "secondary"} className="text-[10px]">
                      {product.stock <= 0 ? "Out of Stock" : `${product.stock} left`}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-extrabold text-amber-700 text-sm">
                      +{suggestedQty} {product.unit || "pcs"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-600">
                    ₱{product.costPrice.toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 font-mono">
                    ₱{estCost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {restockItems.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <CheckSquare className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">All products are well-stocked!</p>
              <p className="text-slate-400 text-[11px] mt-0.5">No items are below minimum stock alert threshold.</p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 flex justify-between items-center sm:justify-between w-full">
          <span className="text-[11px] text-slate-400">
            Take this list to Puregold, DALI, Super8, or Divisoria
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
