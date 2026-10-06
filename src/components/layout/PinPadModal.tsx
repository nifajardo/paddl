"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert, KeyRound, Delete, X } from "lucide-react";
import { sound } from "@/lib/sounds";
import { toast } from "sonner";

interface PinPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verifyPin: (pin: string) => boolean;
  targetFeatureName?: string;
}

export function PinPadModal({
  isOpen,
  onClose,
  onSuccess,
  verifyPin,
  targetFeatureName = "Store Financial Reports",
}: PinPadModalProps) {
  const [pin, setPin] = useState("");
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    sound.click();
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setIsError(false);

      // Auto-verify if 4 digits
      if (nextPin.length === 4) {
        if (verifyPin(nextPin)) {
          sound.chaChing();
          toast.success("Owner access authorized!");
          setPin("");
          onSuccess();
        } else {
          sound.beep();
          setIsError(true);
          toast.error("Incorrect Owner PIN");
        }
      }
    }
  };

  const handleBackspace = () => {
    sound.click();
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    sound.click();
    setPin("");
    setIsError(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyPin(pin)) {
      sound.chaChing();
      toast.success("Owner access authorized!");
      setPin("");
      onSuccess();
    } else {
      sound.beep();
      setIsError(true);
      toast.error("Incorrect Owner PIN. Default is 1234.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs p-6 bg-slate-900 text-white border-slate-800 rounded-2xl shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-bold text-white text-center">
            Owner Authorization
          </DialogTitle>
          <p className="text-xs text-slate-400 text-center mt-1">
            Cashier Mode Active. Enter Owner PIN to access <strong>{targetFeatureName}</strong>.
          </p>
        </DialogHeader>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 my-3">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-150 ${
                  isError
                    ? "bg-rose-500 ring-2 ring-rose-400"
                    : hasDigit
                    ? "bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50"
                    : "bg-slate-700 border border-slate-600"
                }`}
              />
            );
          })}
        </div>

        {isError && (
          <p className="text-[11px] text-rose-400 text-center font-medium animate-pulse">
            Incorrect PIN. Default PIN is 1234
          </p>
        )}

        {/* Number Pad Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-lg font-bold text-white transition flex items-center justify-center border border-slate-700/60 shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-xs font-semibold text-slate-400 transition flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-lg font-bold text-white transition flex items-center justify-center border border-slate-700/60 shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white transition flex items-center justify-center"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium"
          >
            Cancel
          </button>
          <span className="text-slate-500 font-mono text-[10px]">PIN default: 1234</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
