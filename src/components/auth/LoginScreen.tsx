"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { UserRole, StaffUser } from "@/types";
import { ALL_SHOP_PRESETS, ShopPreset } from "@/data/shopPresets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  Zap, 
  Store, 
  User, 
  Sparkles, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Delete,
  Building2,
  Phone,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Wrench,
  Pill,
  Coffee
} from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sounds";

export function LoginScreen() {
  const { 
    staffList, 
    currentStaff, 
    settings, 
    isSupabaseActive, 
    loginWithPin, 
    loginWithEmail, 
    registerStoreAccount, 
    quickDemoLogin, 
    loadShopPreset,
    currentShopPreset,
    isAuthLoading
  } = useStore();

  const [authMode, setAuthMode] = useState<"PIN" | "EMAIL" | "PRESETS">("PIN");

  // PIN Keypad State
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || "staff-1");
  const [pinDigits, setPinDigits] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [isPinShaking, setIsPinShaking] = useState(false);

  // Email / Supabase State
  const [emailTab, setEmailTab] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regStoreName, setRegStoreName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  // Keypad Handlers
  const handleDigitClick = (digit: string) => {
    if (pinDigits.length >= 4) return;
    const newDigits = pinDigits + digit;
    setPinDigits(newDigits);
    setPinError("");

    // Auto-submit on 4th digit
    if (newDigits.length === 4) {
      submitPin(newDigits);
    }
  };

  const handleBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const handleClearPin = () => {
    setPinDigits("");
    setPinError("");
  };

  const submitPin = (pinToTest?: string) => {
    const pin = pinToTest || pinDigits;
    if (pin.length !== 4) {
      setPinError("Please enter all 4 digits of your security PIN.");
      return;
    }

    const res = loginWithPin(selectedStaff.id, pin);
    if (res.success) {
      sound.success();
      toast.success(`Welcome back, ${selectedStaff.name}!`);
    } else {
      sound.error();
      setPinError(res.error || "Incorrect 4-digit PIN.");
      setIsPinShaking(true);
      setTimeout(() => setIsPinShaking(false), 500);
      setPinDigits("");
    }
  };

  // Keyboard support for PIN entry
  useEffect(() => {
    if (authMode !== "PIN") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigitClick(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClearPin();
      } else if (e.key === "Enter") {
        submitPin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authMode, pinDigits, selectedStaffId]);

  // Email Handlers
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!email.trim() || !password.trim()) {
      setEmailError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    if (emailTab === "SIGN_IN") {
      const res = await loginWithEmail(email, password);
      setIsSubmitting(false);
      if (res.error) {
        sound.error();
        setEmailError(res.error);
        toast.error(res.error);
      } else {
        sound.success();
        toast.success("Successfully signed into cloud store!");
      }
    } else {
      const res = await registerStoreAccount(email, password, regStoreName);
      setIsSubmitting(false);
      if (res.error) {
        sound.error();
        setEmailError(res.error);
        toast.error(res.error);
      } else {
        sound.success();
        setEmailSuccess("Store registered! Please check your email to confirm or sign in.");
        toast.success("Account created successfully!");
      }
    }
  };

  // Quick Demo Preset Switcher
  const handleSelectPreset = (presetKey: "SARI_SARI" | "MOTOR_SHOP" | "PHARMACY" | "MILK_TEA") => {
    loadShopPreset(presetKey);
    sound.chaChing();
    toast.success(`Loaded demo dataset: ${ALL_SHOP_PRESETS[presetKey].name}`);
  };

  const handleQuickDemoEnter = (role: UserRole) => {
    quickDemoLogin(role);
    sound.success();
    toast.success(`Entered store as ${role}`);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Top Banner Navigation */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
            P+
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">
                Paddl+ Pro
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5">
                ENTERPRISE POS
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Cloud Point of Sale &amp; MSME Operating System
            </p>
          </div>
        </div>

        {/* Database & Cloud Connection Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSupabaseActive ? "bg-emerald-400" : "bg-blue-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSupabaseActive ? "bg-emerald-500" : "bg-blue-500"}`}></span>
            </span>
            <span className="font-medium text-slate-300 text-[11px] hidden sm:inline">
              {isSupabaseActive ? "Supabase Cloud Database" : "Local Standalone Engine"}
            </span>
            <span className="font-medium text-slate-300 text-[11px] sm:hidden">
              {isSupabaseActive ? "Cloud" : "Local"}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAuthMode("PRESETS")}
            className="text-xs bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-400" />
            <span className="hidden md:inline">Business Templates</span>
            <span className="md:hidden">Presets</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Store Profile & Business Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected Store Terminal
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Secure Store Terminal Login
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sign in with your staff 4-digit PIN or merchant cloud account to unlock POS checkout, inventory records, and financial ledgers.
              </p>
            </div>

            {/* Active Store Profile Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Active Store Profile
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Store className="h-4 w-4 text-emerald-400" />
                    {settings.storeName}
                  </h3>
                  <p className="text-xs text-slate-400 italic">
                    "{settings.tagline}"
                  </p>
                </div>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                  {ALL_SHOP_PRESETS[currentShopPreset]?.badge || "Retail Shop"}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{settings.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{settings.phone}</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Access Bar for Presentations */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Quick Client Demo Bypass
                </span>
                <span className="text-[10px] text-slate-400">1-click unlock</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickDemoEnter("OWNER")}
                  className="bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300 text-xs font-semibold h-9"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Enter as Owner
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickDemoEnter("CASHIER")}
                  className="bg-blue-950/40 hover:bg-blue-900/60 border-blue-500/40 text-blue-300 text-xs font-semibold h-9"
                >
                  <User className="h-3.5 w-3.5 mr-1 text-blue-400" />
                  Enter as Cashier
                </Button>
              </div>
            </div>

          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
              
              {/* Auth Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("PIN");
                    setPinError("");
                  }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    authMode === "PIN"
                      ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Staff PIN Keypad
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("EMAIL");
                    setEmailError("");
                  }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    authMode === "EMAIL"
                      ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Cloud Account
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode("PRESETS")}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    authMode === "PRESETS"
                      ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Shop Presets
                </button>
              </div>

              {/* MODE 1: STAFF PIN KEYPAD */}
              {authMode === "PIN" && (
                <div className="space-y-6">
                  {/* Staff User Avatar Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      1. Select Your Staff Profile
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {staffList.map((staff) => {
                        const isSelected = staff.id === selectedStaffId;
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(staff.id);
                              setPinDigits("");
                              setPinError("");
                            }}
                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                              }`}>
                                {staff.name.charAt(0)}
                              </div>
                              <span className="text-[9px] font-mono opacity-60">PIN: {staff.pin}</span>
                            </div>
                            <div className="truncate font-semibold text-xs text-white">
                              {staff.name}
                            </div>
                            <div className="text-[10px] text-emerald-400/90 font-medium">
                              {staff.role}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4-Digit PIN Display */}
                  <div className="space-y-2 text-center">
                    <Label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      2. Enter 4-Digit Security PIN
                    </Label>
                    
                    <div className={`flex items-center justify-center gap-3 py-3 ${isPinShaking ? "animate-bounce" : ""}`}>
                      {[0, 1, 2, 3].map((index) => {
                        const isFilled = pinDigits.length > index;
                        return (
                          <div
                            key={index}
                            className={`h-12 w-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                              isFilled
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/20"
                                : "border-slate-800 bg-slate-950/80 text-slate-700"
                            }`}
                          >
                            {isFilled ? (
                              <div className="h-4 w-4 rounded-full bg-emerald-400 animate-pulse" />
                            ) : (
                              <span className="text-xl font-mono text-slate-700">•</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {pinError && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{pinError}</span>
                      </div>
                    )}
                  </div>

                  {/* Touch Keypad */}
                  <div className="max-w-xs mx-auto grid grid-cols-3 gap-2.5">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitClick(num)}
                        className="h-13 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600 active:text-white border border-slate-700/80 text-lg font-bold text-white transition shadow-sm"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearPin}
                      className="h-13 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick("0")}
                      className="h-13 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600 active:text-white border border-slate-700/80 text-lg font-bold text-white transition shadow-sm"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-13 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 transition"
                      aria-label="Backspace"
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="button"
                    onClick={() => submitPin()}
                    disabled={pinDigits.length !== 4}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-40"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In as {selectedStaff.name} ({selectedStaff.role})
                  </Button>
                </div>
              )}

              {/* MODE 2: SUPABASE CLOUD EMAIL */}
              {authMode === "EMAIL" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setEmailTab("SIGN_IN")}
                        className={`text-sm font-bold pb-1 transition border-b-2 ${
                          emailTab === "SIGN_IN"
                            ? "border-emerald-500 text-white"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailTab("SIGN_UP")}
                        className={`text-sm font-bold pb-1 transition border-b-2 ${
                          emailTab === "SIGN_UP"
                            ? "border-emerald-500 text-white"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Register Store
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      Supabase Cloud Auth
                    </span>
                  </div>

                  <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                    {emailTab === "SIGN_UP" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300 font-semibold">Store / Business Name</Label>
                        <Input
                          type="text"
                          placeholder="e.g. My Motor Parts & Accessories"
                          value={regStoreName}
                          onChange={(e) => setRegStoreName(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">Email Address</Label>
                      <Input
                        type="email"
                        required
                        placeholder="owner@yourstore.ph"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">Password</Label>
                      <Input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                      />
                    </div>

                    {emailError && (
                      <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        <span>{emailError}</span>
                      </div>
                    )}

                    {emailSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{emailSuccess}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting || isAuthLoading}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                    >
                      {isSubmitting || isAuthLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Authenticating with Cloud...
                        </>
                      ) : emailTab === "SIGN_IN" ? (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Sign In to Cloud Store
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 mr-2" />
                          Create New Store Account
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {/* MODE 3: BUSINESS PRESET SELECTOR */}
              {authMode === "PRESETS" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Select Business Template</h4>
                      <p className="text-xs text-slate-400">
                        Choose a shop category to preload tailored inventory, utang entries, and receipts.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. SARI SARI */}
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("SARI_SARI")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between group ${
                        currentShopPreset === "SARI_SARI"
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🏪</span>
                        <Badge variant="outline" className={currentShopPreset === "SARI_SARI" ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-400"}>
                          {currentShopPreset === "SARI_SARI" ? "Active" : "Select"}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                          Sari-Sari Store &amp; Grocery
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          Pancit canton, canned goods, rice sacks, e-load, and neighborhood utang book.
                        </div>
                      </div>
                    </button>

                    {/* 2. MOTOR SHOP */}
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("MOTOR_SHOP")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between group ${
                        currentShopPreset === "MOTOR_SHOP"
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🏍️</span>
                        <Badge variant="outline" className={currentShopPreset === "MOTOR_SHOP" ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-400"}>
                          {currentShopPreset === "MOTOR_SHOP" ? "Active" : "Select"}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                          Motorcycle Parts &amp; Repair
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          Motul oils, tubeless tires, spark plugs, drive belts, and tune-up labor services.
                        </div>
                      </div>
                    </button>

                    {/* 3. PHARMACY */}
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("PHARMACY")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between group ${
                        currentShopPreset === "PHARMACY"
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">💊</span>
                        <Badge variant="outline" className={currentShopPreset === "PHARMACY" ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-400"}>
                          {currentShopPreset === "PHARMACY" ? "Active" : "Select"}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                          Botika &amp; Pharmacy
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          Generic &amp; Rx medicines, dosage, lot numbers, and near-expiry warning alerts.
                        </div>
                      </div>
                    </button>

                    {/* 4. MILK TEA */}
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("MILK_TEA")}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between group ${
                        currentShopPreset === "MILK_TEA"
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🧋</span>
                        <Badge variant="outline" className={currentShopPreset === "MILK_TEA" ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-400"}>
                          {currentShopPreset === "MILK_TEA" ? "Active" : "Select"}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                          Milk Tea &amp; Snack Cafe
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          Boba drinks, fruit teas, espresso, waffles, poppers, and sinker add-ons.
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => setAuthMode("PIN")}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs h-10 rounded-xl"
                    >
                      Continue with Selected Template &rarr;
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-900 bg-slate-950 px-4 sm:px-8 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div>
          <span>Paddl+ Pro • Built for Philippine MSMEs</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Enterprise Encryption Active</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Compliant with PH DTI &amp; BIR Standards</span>
        </div>
      </footer>
    </div>
  );
}
