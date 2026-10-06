"use client";

import React from "react";
import { useStore } from "@/context/StoreContext";
import { ALL_SHOP_PRESETS } from "@/data/shopPresets";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sounds";

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PresetModal({ isOpen, onClose }: PresetModalProps) {
  const { currentShopPreset, loadShopPreset } = useStore();

  const handleSelect = (key: "SARI_SARI" | "MOTOR_SHOP" | "PHARMACY" | "MILK_TEA") => {
    loadShopPreset(key);
    sound.chaChing();
    toast.success(`Switched to business template: ${ALL_SHOP_PRESETS[key].name}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6 bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Switch Business Test Dataset
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Load realistic inventory, barcodes, customer debts, and transactions for various MSME shops.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {Object.entries(ALL_SHOP_PRESETS).map(([key, preset]) => {
            const isCurrent = currentShopPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key as any)}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between group ${
                  isCurrent
                    ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{preset.icon}</span>
                  {isCurrent ? (
                    <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                      <Check className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                      Load
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                    {preset.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
