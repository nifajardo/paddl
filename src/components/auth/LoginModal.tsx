"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Zap,
  ArrowRight,
  RefreshCw,
  Store
} from "lucide-react";
import { toast } from "sonner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { 
    staffList, 
    currentStaff, 
    loginWithPin,
    signInWithEmail, 
    isAuthLoading, 
    sessionUser, 
    signOut, 
    isSupabaseActive, 
    settings,
    appMode
  } = useStore();

  const [authMode, setAuthMode] = useState<"EMAIL" | "PIN">("PIN");

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick PIN switcher form
  const [selectedStaffId, setSelectedStaffId] = useState(currentStaff.id);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const res = await signInWithEmail(email, password);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
      toast.error(res.error);
    } else {
      toast.success("Successfully authenticated!");
      onClose();
    }
  };

  const handlePinSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    const targetStaff = staffList.find((s) => s.id === selectedStaffId);
    if (!targetStaff) return;

    const result = loginWithPin(targetStaff.id, enteredPin);
    if (result.success) {
      toast.success(`Switched active user to ${targetStaff.name} (${targetStaff.role})`);
      setEnteredPin("");
      onClose();
    } else {
      setPinError("Incorrect PIN for the selected employee.");
      toast.error("Incorrect PIN");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
              P+
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Store Access & User Login
              </DialogTitle>
              <p className="text-[11px] text-slate-500">{settings.storeName} • Paddl+ Pro Enterprise</p>
            </div>
          </div>
        </DialogHeader>

        {/* Supabase Connectivity Banner */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${isSupabaseActive ? "text-emerald-500" : "text-blue-500"}`} />
            <div>
              <span className="font-bold text-slate-900">
                {isSupabaseActive ? "Cloud backup available" : "Device workspace"}
              </span>
              <p className="text-[10px] text-slate-400 font-mono">
                {sessionUser ? "Cloud account signed in" : appMode === "DEMO" ? "Local demo staff access" : "Business staff access"}
              </p>
            </div>
          </div>

          <Badge variant="outline" className={`text-[10px] ${isSupabaseActive ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-blue-300 text-blue-700 bg-blue-50"}`}>
            {sessionUser ? "Signed in" : "Device only"}
          </Badge>
        </div>

        {/* Tab Switcher: Quick Cashier PIN vs Supabase Cloud Email */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthMode("PIN");
              setErrorMessage("");
            }}
            className={`py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
              authMode === "PIN"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Quick Cashier PIN
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("EMAIL");
              setPinError("");
            }}
            className={`py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
              authMode === "EMAIL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Supabase Account
          </button>
        </div>

        {/* MODE 1: QUICK CASHIER PIN SWITCHER */}
        {authMode === "PIN" && (
          <form onSubmit={handlePinSignIn} className="space-y-4 text-xs pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                1. Select Cashier / Staff Profile:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {staffList.filter((s) => s.isActive !== false).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(st.id);
                      setPinError("");
                    }}
                    className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                      selectedStaffId === st.id
                        ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                      {st.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 text-xs truncate">{st.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{st.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cashier-pin-input" className="text-xs font-semibold text-slate-700">
                  2. Enter staff PIN:
                </Label>
                {appMode === "DEMO" && <span className="text-[10px] text-slate-400 font-mono">Demo: 1234</span>}
              </div>
              <Input
                id="cashier-pin-input"
                type="password"
                maxLength={6}
                required
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
                className="h-11 text-center font-mono text-xl tracking-widest font-black bg-slate-50"
                autoFocus
              />
              {pinError && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {pinError}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
              >
                Log In as Cashier
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* MODE 2: SUPABASE EMAIL / PASSWORD AUTH */}
        {authMode === "EMAIL" && (
          <form onSubmit={handleEmailSignIn} className="space-y-3.5 text-xs pt-1">
            <div className="space-y-1">
              <Label htmlFor="login-email" className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <Input
                id="login-email"
                type="email"
                required
                placeholder="storeowner@peddlr.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs h-9 bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-xs h-9 bg-slate-50"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <DialogFooter className="pt-2 flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Back
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || isAuthLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Verifying...
                    </span>
                  ) : (
                    "Sign In with Supabase"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
