"use client";
import JsBarcode from "jsbarcode";
import { printDocument } from "@/lib/printing";

import React, { useState } from "react";
import { Product } from "@/types";
import { useStore } from "@/context/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Search, Tag, CheckSquare, Square, X } from "lucide-react";

interface BarcodeLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Code 128 includes start/stop symbols and checksum, unlike the old visual hash.
function SvgBarcode({ value }: { value: string }) {
  const encoded = React.useMemo(() => {
    const result: { encodings?: { data: string }[] } = {};
    try { JsBarcode(result, value, { format: "CODE128", displayValue: false }); return result.encodings?.map((part) => part.data).join("") || ""; }
    catch { return ""; }
  }, [value]);
  if (!encoded) return <span className="text-xs text-red-700">Set a valid ASCII barcode to print this label.</span>;
  return <svg role="img" aria-label={`Code 128 barcode ${value}`} viewBox={`0 0 ${encoded.length + 20} 45`} style={{width:"100%",height:"45px"}} preserveAspectRatio="xMidYMid meet">
    <rect width={encoded.length + 20} height={45} fill="white" />
    {[...encoded].map((bit, index) => bit === "1" ? <rect key={index} x={index + 10} y={0} width={1} height={45} fill="black" /> : null)}
  </svg>;
}
export function BarcodeLabelsModal({ isOpen, onClose }: BarcodeLabelsModalProps) {
  const { products, settings } = useStore();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, number>>({});
  const [labelFormat, setLabelFormat] = useState<"SHEET" | "ROLL">("SHEET");

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = 1;
      }
      return copy;
    });
  };

  const setQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setSelectedIds((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } else {
      setSelectedIds((prev) => ({ ...prev, [id]: qty }));
    }
  };

  const selectAll = () => {
    const map: Record<string, number> = {};
    filteredProducts.forEach((p) => {
      map[p.id] = 1;
    });
    setSelectedIds(map);
  };

  const clearSelection = () => {
    setSelectedIds({});
  };

  const selectedCount = Object.keys(selectedIds).length;
  const totalLabelsToPrint = Object.values(selectedIds).reduce((a, b) => a + b, 0);

  // Flatten selected products by count
  const labelsToPrint: Product[] = [];
  Object.entries(selectedIds).forEach(([id, qty]) => {
    const prod = products.find((p) => p.id === id);
    if (prod) {
      for (let i = 0; i < qty; i++) {
        labelsToPrint.push(prod);
      }
    }
  });

  const handlePrint = () => {
    printDocument("#printable-barcode-labels", `${settings.storeName} — Barcode labels`, labelFormat === "SHEET" ? "sheet" : "receipt");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Tag className="h-5 w-5 text-emerald-600" />
              Print Barcode Shelf Labels
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {selectedCount} item(s) selected • {totalLabelsToPrint} label(s) total
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 print:overflow-visible">
          {/* Controls - Hidden during print */}
          <div className="print:hidden space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products to tag..."
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={selectAll}
                  className="text-xs h-8"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select All ({filteredProducts.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={clearSelection}
                  className="text-xs h-8 text-slate-500"
                >
                  Clear
                </Button>
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => setLabelFormat("SHEET")}
                    className={`px-2.5 py-1.5 font-medium transition ${
                      labelFormat === "SHEET" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    A4 / Letter Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelFormat("ROLL")}
                    className={`px-2.5 py-1.5 font-medium transition ${
                      labelFormat === "ROLL" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    58mm / 80mm Roll
                  </button>
                </div>
              </div>
            </div>

            {/* Product selection chips */}
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
              {filteredProducts.map((p) => {
                const isSelected = Boolean(selectedIds[p.id]);
                const qty = selectedIds[p.id] || 1;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 text-xs transition ${
                      isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => toggleSelect(p.id)}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {p.barcode || "No Barcode"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">₱{p.sellingPrice.toFixed(2)}</span>
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-slate-400">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={qty}
                            onChange={(e) => setQuantity(p.id, parseInt(e.target.value) || 1)}
                            className="w-12 h-6 text-center border border-slate-200 rounded font-semibold text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Printable Labels Canvas */}
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 print:bg-white print:p-0 print:border-none">
            <div className="flex items-center justify-between pb-3 text-xs font-semibold text-slate-600 print:hidden">
              <span>Preview ({totalLabelsToPrint} labels generated):</span>
              <span className="text-[11px] text-slate-400">Optimized for high-contrast barcode scanners</span>
            </div>

            {labelsToPrint.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select one or more products above to generate shelf barcode tags.
              </div>
            ) : (
              <div id="printable-barcode-labels"
                className={`gap-3 ${
                  labelFormat === "SHEET"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3 print:gap-2"
                    : "flex flex-col items-center gap-4 print:block print:space-y-4"
                }`}
              >
                {labelsToPrint.map((prod, index) => (
                  <div
                    key={`${prod.id}-${index}`}
                    className={`bg-white border-2 border-dashed border-slate-300 print:border print:border-black rounded-lg p-3 flex flex-col justify-between text-center page-break-inside-avoid ${
                      labelFormat === "ROLL" ? "w-64 max-w-full" : ""
                    }`}
                  >
                    {/* Header: Store Name */}
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500 truncate pb-0.5">
                      {settings.storeName}
                    </div>

                    {/* Product Name */}
                    <div className="font-bold text-xs text-slate-900 line-clamp-2 min-h-[32px] leading-tight flex items-center justify-center">
                      {prod.name}
                    </div>

                    {/* Expiration or dosage tag if available */}
                    {(prod.dosage || prod.expirationDate) && (
                      <div className="text-[9px] text-slate-500 font-mono">
                        {prod.dosage && <span>{prod.dosage} </span>}
                        {prod.expirationDate && <span>• Exp: {prod.expirationDate}</span>}
                      </div>
                    )}

                    {/* Barcode Graphic */}
                    <div className="my-1.5 px-1 bg-white">
                      <SvgBarcode value={prod.barcode || prod.id} />
                      <div className="font-mono text-[9px] tracking-widest text-slate-700 mt-0.5 font-bold">
                        {prod.barcode || prod.id}
                      </div>
                    </div>

                    {/* Price - Extra Large */}
                    <div className="pt-1 border-t border-slate-200 mt-1 flex items-baseline justify-center gap-0.5">
                      <span className="text-[10px] font-bold text-slate-500">SRP</span>
                      <span className="text-lg font-black text-slate-950 font-mono">
                        ₱{prod.sellingPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex gap-2 justify-between items-center pt-3 border-t border-slate-100 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            disabled={labelsToPrint.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print {totalLabelsToPrint} Label{totalLabelsToPrint === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
