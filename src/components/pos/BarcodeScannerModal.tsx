"use client";

import React, { useState } from "react";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScanBarcode, Plus, Search, Check } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddProduct: (product: Product) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  onAddProduct,
}: BarcodeScannerModalProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const cleaned = barcodeInput.trim();
    if (!cleaned) return;

    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === cleaned.toLowerCase() ||
        p.id.toLowerCase() === cleaned.toLowerCase()
    );

    if (matched) {
      onAddProduct(matched);
      setLastScanned(matched);
      setBarcodeInput("");
    } else {
      setErrorMsg(`No product found with Barcode / SKU "${cleaned}"`);
    }
  };

  const handleQuickAddPreset = (prod: Product) => {
    onAddProduct(prod);
    setLastScanned(prod);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-indigo-600" />
            <span>Barcode Scanner Terminal</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleScanSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Plug in your USB/Bluetooth barcode scanner or manually type any product barcode to instantly add it to cart.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Scan or enter barcode (e.g. 4800016010015)..."
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setErrorMsg("");
                }}
                className="pl-9 text-xs"
                autoFocus
              />
            </div>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              Scan
            </Button>
          </div>

          {errorMsg && (
            <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {errorMsg}
            </div>
          )}

          {lastScanned && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{lastScanned.emoji}</span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">{lastScanned.name}</h4>
                  <p className="text-[11px] text-emerald-700">₱{lastScanned.sellingPrice.toFixed(2)} • Added to Cart</p>
                </div>
              </div>
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
          )}

          {/* Quick Barcode Presets for Easy Demo */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Quick Barcode Presets (Tap to Test Scan):
            </span>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickAddPreset(p)}
                  className="text-left p-2 rounded border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex items-center gap-1.5 text-xs"
                >
                  <span className="text-base">{p.emoji}</span>
                  <div className="truncate flex-1">
                    <p className="font-medium truncate text-[11px]">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.barcode}</p>
                  </div>
                  <Plus className="h-3 w-3 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Done Scanning
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
