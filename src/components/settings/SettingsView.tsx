"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Store, 
  Users, 
  Cloud, 
  Database, 
  RotateCcw, 
  Download, 
  Upload, 
  CheckCircle2, 
  Save, 
  Wifi, 
  WifiOff,
  Copy,
  ExternalLink,
  Server,
  QrCode,
  ShieldCheck,
  Lock,
  Smartphone,
  KeyRound,
  Type,
  UserPlus,
  Trash2,
  Calendar,
  Check,
  Sliders,
  AlertTriangle
} from "lucide-react";
import { UserRole, StaffUser } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function SettingsView() {
  const { 
    settings, 
    staffList, 
    currentStaff, 
    isOnline, 
    pendingSyncCount, 
    isSyncing, 
    isSupabaseActive,
    updateSettings, 
    switchStaff, 
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffActive,
    setFontSizeMode,
    syncCloud, 
    exportDataJson, 
    importDataJson, 
    resetToDemoData 
  } = useStore();

  // Form states
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [tinNumber, setTinNumber] = useState(settings.tinNumber);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooterMessage);
  const [gcashNumber, setGcashNumber] = useState(settings.gcashNumber || "0917-123-4567");
  const [mayaNumber, setMayaNumber] = useState(settings.mayaNumber || "0918-987-6543");
  const [ownerPin, setOwnerPin] = useState(settings.ownerPin || "1234");
  const [requirePinForReports, setRequirePinForReports] = useState(settings.requirePinForReports ?? true);

  // Accessibility & Display State
  const [fontSizeMode, setLocalFontSizeMode] = useState<"NORMAL" | "LARGE">(settings.fontSizeMode || "NORMAL");
  const [expirationWarningDays, setExpirationWarningDays] = useState<number>(settings.expirationWarningDays || 30);
  const [displaySaved, setDisplaySaved] = useState(false);

  // Staff Management State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<UserRole>("CASHIER");
  const [newStaffPin, setNewStaffPin] = useState("1234");
  const [editingPermissionsStaffId, setEditingPermissionsStaffId] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [walletSaved, setWalletSaved] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim(),
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      tinNumber: tinNumber.trim(),
      receiptFooterMessage: receiptFooter.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveWallets = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      gcashNumber: gcashNumber.trim(),
      mayaNumber: mayaNumber.trim(),
    });
    setWalletSaved(true);
    setTimeout(() => setWalletSaved(false), 2500);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ownerPin: ownerPin.trim() || "1234",
      requirePinForReports,
    });
    setSecuritySaved(true);
    setTimeout(() => setSecuritySaved(false), 2500);
  };

  const handleSaveDisplay = (e: React.FormEvent) => {
    e.preventDefault();
    setFontSizeMode(fontSizeMode);
    updateSettings({
      fontSizeMode,
      expirationWarningDays,
    });
    setDisplaySaved(true);
    setTimeout(() => setDisplaySaved(false), 2500);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    addStaff({
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      pin: newStaffPin.trim() || "1234",
      isActive: true,
      permissions: {
        canVoidTransactions: newStaffRole === "OWNER" || newStaffRole === "MANAGER",
        canProcessReturns: newStaffRole === "OWNER" || newStaffRole === "MANAGER",
        canViewFinancialReports: newStaffRole === "OWNER" || newStaffRole === "MANAGER",
        canManageInventory: true,
        canManageStaff: newStaffRole === "OWNER",
        canModifySettings: newStaffRole === "OWNER",
      },
    });

    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffRole("CASHIER");
    setNewStaffPin("1234");
    setIsAddStaffOpen(false);
  };

  const handleToggleStaffPermission = (staffId: string, permKey: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) return;
    const currentPerms = target.permissions || {
      canVoidTransactions: false,
      canProcessReturns: false,
      canViewFinancialReports: false,
      canManageInventory: true,
      canManageStaff: false,
      canModifySettings: false,
    };
    updateStaff(staffId, {
      permissions: {
        ...currentPerms,
        [permKey]: !(currentPerms as any)[permKey],
      },
    });
  };

  const handleCopySqlScript = () => {
    const sqlScript = `-- Peddlr Plus: Supabase Table Creation Script
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    category TEXT NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 10,
    unit TEXT NOT NULL DEFAULT 'pcs',
    emoji TEXT NOT NULL DEFAULT '🥫',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 2000.00,
    total_debt NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_entries (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    transaction_id TEXT,
    type TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'NONE',
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    amount_tendered NUMERIC(12, 2) NOT NULL,
    change_due NUMERIC(12, 2) NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    cashier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    ewallet_ref_number TEXT,
    is_backdated BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    receipt_ref TEXT,
    recorded_by TEXT NOT NULL
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on debt_entries" ON debt_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
`;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExport = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peddlr_plus_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const ok = importDataJson(importText);
    if (ok) {
      setImportStatus("Database restored successfully!");
      setImportText("");
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      setImportStatus("Error: Invalid JSON format.");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-700" />
          Store Settings & Database Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure store receipt details, multi-user role access, and Supabase cloud database
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Store Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supabase Status Banner */}
          <Card className={`border-2 ${isSupabaseActive ? "bg-emerald-50/50 border-emerald-400" : "bg-blue-50/50 border-blue-300"}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className={`h-5 w-5 ${isSupabaseActive ? "text-emerald-700" : "text-blue-700"}`} />
                  <h3 className="font-bold text-sm text-slate-900">
                    Database Engine: {isSupabaseActive ? "Supabase Cloud PostgreSQL Active" : "Local Store Ready (Hybrid Fallback)"}
                  </h3>
                </div>
                <Badge className={isSupabaseActive ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}>
                  {isSupabaseActive ? "🟢 Connected" : "Local Mode (Testing)"}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {isSupabaseActive
                  ? "Your app is connected live to your Supabase PostgreSQL database. Changes to inventory, sales, utang, and expenses sync seamlessly across all connected cashiers and devices."
                  : "Currently operating in Local Storage mode with realistic Philippine store demo data. To connect your live Supabase cloud database, simply add your credentials to .env.local or Vercel environment variables."}
              </p>

              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="font-semibold text-slate-800">Quick 2-Step Supabase Setup:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>
                    Run the SQL Schema in your{" "}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Supabase SQL Editor <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </li>
                  <li>
                    Add <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your{" "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.env.local</code>
                  </li>
                </ol>

                <div className="pt-1 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleCopySqlScript}
                    className="text-xs bg-slate-50 border-slate-300"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copiedSql ? "Copied SQL Script!" : "Copy Supabase SQL Script"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Profile Card */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Store Profile & Receipt Header</h3>
                </div>
                {savedSuccess && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
                  </Badge>
                )}
              </div>

              <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="set-name" className="text-xs font-semibold">Store Business Name</Label>
                    <Input
                      id="set-name"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="set-tag" className="text-xs font-semibold">Tagline / Motto</Label>
                    <Input
                      id="set-tag"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="set-addr" className="text-xs font-semibold">Complete Store Address</Label>
                  <Input
                    id="set-addr"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="set-phone" className="text-xs font-semibold">Contact Phone Number</Label>
                    <Input
                      id="set-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="set-tin" className="text-xs font-semibold">Tax Identification No. (TIN)</Label>
                    <Input
                      id="set-tin"
                      value={tinNumber}
                      onChange={(e) => setTinNumber(e.target.value)}
                      placeholder="e.g. 123-456-789-000"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="set-footer" className="text-xs font-semibold">Receipt Footer Message</Label>
                  <Input
                    id="set-footer"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <Save className="h-4 w-4 mr-1.5" /> Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* BSP QR Ph & E-Wallets */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">BSP QR Ph & E-Wallet Settlement</h3>
                    <p className="text-[11px] text-slate-500">Auto-displays in POS checkout for GCash, Maya, and online bank payments</p>
                  </div>
                </div>
                {walletSaved && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
                  </Badge>
                )}
              </div>

              <form onSubmit={handleSaveWallets} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="set-gcash" className="text-xs font-semibold flex items-center gap-1 text-slate-700">
                      <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                      GCash Registered Mobile No.
                    </Label>
                    <Input
                      id="set-gcash"
                      value={gcashNumber}
                      onChange={(e) => setGcashNumber(e.target.value)}
                      placeholder="e.g. 0917-123-4567"
                      className="text-xs h-9 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Shown to customers on the interactive QR Ph card</p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="set-maya" className="text-xs font-semibold flex items-center gap-1 text-slate-700">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                      Maya Registered Mobile No.
                    </Label>
                    <Input
                      id="set-maya"
                      value={mayaNumber}
                      onChange={(e) => setMayaNumber(e.target.value)}
                      placeholder="e.g. 0918-987-6543"
                      className="text-xs h-9 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Alternative QR Ph e-wallet account</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    <Save className="h-4 w-4 mr-1.5" /> Save E-Wallet Accounts
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Anti-Kupit & Security PIN Lock */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Anti-Kupit & Staff Security Lock</h3>
                    <p className="text-[11px] text-slate-500">Protect confidential gross margins, COGS, and financial reports from cashier access</p>
                  </div>
                </div>
                {securitySaved && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
                  </Badge>
                )}
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <Label htmlFor="set-pin" className="text-xs font-semibold flex items-center gap-1 text-slate-700">
                      <KeyRound className="h-3.5 w-3.5 text-purple-600" />
                      Owner 4-Digit Master PIN
                    </Label>
                    <Input
                      id="set-pin"
                      type="password"
                      maxLength={4}
                      value={ownerPin}
                      onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="1234"
                      className="text-xs h-9 font-mono tracking-widest text-center font-bold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-400">Used to unlock Financial Reports & Settings when cashier is on duty</p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      Security Lockout Policy
                    </Label>
                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-100/70 transition">
                      <input
                        type="checkbox"
                        checked={requirePinForReports}
                        onChange={(e) => setRequirePinForReports(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-[11px] text-slate-700 leading-tight">
                        <strong className="block text-slate-900">Enforce PIN Gate for Cashiers</strong>
                        Prompts 4-digit PIN pad when any staff role other than OWNER tries to view Sales Reports or Store Settings.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                    <Save className="h-4 w-4 mr-1.5" /> Save Security PIN
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Display & Accessibility (Senior Merchant Support) */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Display & Accessibility</h3>
                    <p className="text-[11px] text-slate-500">Configure font size readability and stock expiration warning thresholds</p>
                  </div>
                </div>
                {displaySaved && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
                  </Badge>
                )}
              </div>

              <form onSubmit={handleSaveDisplay} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Font Size Mode */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                      POS Text & Button Sizing:
                    </Label>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setLocalFontSizeMode("NORMAL")}
                        className={`p-2.5 rounded-lg border text-left transition ${
                          fontSizeMode === "NORMAL"
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs block">Normal (Standard)</span>
                        <span className="text-[10px] opacity-80 block">Default compact view</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLocalFontSizeMode("LARGE")}
                        className={`p-2.5 rounded-lg border text-left transition ${
                          fontSizeMode === "LARGE"
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm font-bold block">Large (Accessible)</span>
                        <span className="text-[10px] opacity-80 block">For older store owners</span>
                      </button>
                    </div>
                  </div>

                  {/* Expiration Warning Days */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <Label htmlFor="set-exp-days" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                      Near-Expiry Alert Warning (Days):
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      Products expiring within this timeframe display an amber warning badge in POS & Inventory
                    </p>
                    <select
                      id="set-exp-days"
                      value={expirationWarningDays}
                      onChange={(e) => setExpirationWarningDays(parseInt(e.target.value) || 30)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-800 focus:outline-none"
                    >
                      <option value={7}>7 Days Before Expiration (Strict Freshness)</option>
                      <option value={14}>14 Days Before Expiration</option>
                      <option value={30}>30 Days Before Expiration (Standard Retail)</option>
                      <option value={60}>60 Days Before Expiration (Pharmacy / Wholesale)</option>
                      <option value={90}>90 Days Before Expiration</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <Save className="h-4 w-4 mr-1.5" /> Save Display & Expiry Preferences
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Multi-User & Role Management (RBAC) */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">User Access & Role-Based Permissions</h3>
                    <p className="text-[11px] text-slate-500">
                      Multi-device access control: Owner, Manager, Cashier, and Inventory Staff
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddStaffOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 font-semibold gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Employee
                </Button>
              </div>

              <div className="space-y-3">
                {staffList.map((st) => {
                  const isCurrent = st.id === currentStaff.id;
                  const isOwner = st.role === "OWNER";
                  const isEditingPermissions = editingPermissionsStaffId === st.id;

                  return (
                    <div
                      key={st.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-3 transition ${
                        isCurrent
                          ? "bg-indigo-50/50 border-indigo-300"
                          : st.isActive === false
                          ? "bg-slate-100/60 border-slate-200 opacity-60"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Staff Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  st.role === "OWNER"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : st.role === "MANAGER"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : st.role === "INVENTORY_STAFF"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {st.role}
                              </Badge>

                              {st.isActive === false ? (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 bg-slate-400">
                                  Disabled
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-800">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{st.email} • PIN: {st.pin}</p>
                          </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2">
                          {isCurrent ? (
                            <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Current Session
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => switchStaff(st.id)}
                              className="text-xs h-7"
                              disabled={st.isActive === false}
                            >
                              Switch User
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleStaffActive(st.id)}
                            disabled={isOwner}
                            className={`text-xs h-7 ${st.isActive === false ? "text-emerald-700 hover:bg-emerald-50" : "text-amber-700 hover:bg-amber-50"}`}
                          >
                            {st.isActive === false ? "Enable Account" : "Disable"}
                          </Button>

                          {!isOwner && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => deleteStaff(st.id)}
                              className="text-xs h-7 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Role and Permissions Control Bar */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-semibold">Change Role:</span>
                          <select
                            value={st.role}
                            onChange={(e) => updateStaff(st.id, { role: e.target.value as UserRole })}
                            disabled={isOwner}
                            className="h-7 px-2 rounded border border-slate-200 bg-white font-medium text-xs text-slate-800 focus:outline-none"
                          >
                            <option value="OWNER">Owner / Admin</option>
                            <option value="MANAGER">Manager</option>
                            <option value="CASHIER">Cashier</option>
                            <option value="INVENTORY_STAFF">Inventory Staff</option>
                          </select>
                        </div>

                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setEditingPermissionsStaffId(isEditingPermissions ? null : st.id)}
                          className="text-[11px] text-indigo-700 hover:bg-indigo-50 h-7"
                        >
                          {isEditingPermissions ? "Hide Permissions ▲" : "Configure Permissions ▼"}
                        </Button>
                      </div>

                      {/* Expandable Permissions Checklist */}
                      {isEditingPermissions && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {[
                            { key: "canVoidTransactions", label: "Void / Cancel Sales" },
                            { key: "canProcessReturns", label: "Process Returns & Refunds" },
                            { key: "canViewFinancialReports", label: "View Financial P&L & Reports" },
                            { key: "canManageInventory", label: "Manage Inventory & Restocks" },
                            { key: "canManageStaff", label: "Create & Manage Staff Accounts" },
                            { key: "canModifySettings", label: "Modify Store Settings & PINs" },
                          ].map((perm) => {
                            const isChecked = Boolean(st.permissions && (st.permissions as any)[perm.key]);
                            return (
                              <label
                                key={perm.key}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isOwner}
                                  onChange={() => handleToggleStaffPermission(st.id, perm.key)}
                                  className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5"
                                />
                                <span className={isOwner ? "text-slate-500 font-semibold" : "text-slate-800"}>
                                  {perm.label} {isOwner && "(Always Allowed)"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Cloud Sync & Backup */}
        <div className="space-y-6">
          {/* Cloud Sync Status */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Cloud className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Cloud Sync & Resilience</h3>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Network State:</span>
                  <span className="flex items-center gap-1 font-bold">
                    {isOnline ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Wifi className="h-3.5 w-3.5" /> Online
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <WifiOff className="h-3.5 w-3.5" /> Offline Mode
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Pending Sync Items:</span>
                  <span className="font-bold font-mono">{pendingSyncCount} changes</span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Sync Protocol:</span>
                  <span>{isSupabaseActive ? "Supabase Realtime" : "LocalStorage Engine"}</span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={syncCloud}
                disabled={isSyncing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9"
              >
                {isSyncing ? "Syncing..." : "Sync to Cloud Now"}
              </Button>
            </CardContent>
          </Card>

          {/* Backup & Restore Data */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Database className="h-5 w-5 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">Database Backup & Recovery</h3>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="w-full text-xs justify-start h-9"
                >
                  <Download className="h-3.5 w-3.5 mr-2 text-slate-600" />
                  Export Full Store Backup (.json)
                </Button>

                <div className="pt-2 space-y-1.5">
                  <Label htmlFor="import-area" className="text-xs font-semibold text-slate-600">
                    Restore from JSON Backup:
                  </Label>
                  <textarea
                    id="import-area"
                    rows={3}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste exported backup JSON here..."
                    className="w-full p-2 text-[10px] font-mono border rounded-md border-slate-200 focus:outline-none"
                  />
                  <Button
                    size="xs"
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    className="w-full text-xs bg-slate-900 text-white"
                  >
                    <Upload className="h-3 w-3 mr-1" /> Restore Database
                  </Button>
                  {importStatus && (
                    <p className="text-[11px] text-center font-semibold text-emerald-700 mt-1">
                      {importStatus}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to reset all store data to the Philippine MSME default demo?")) {
                      resetToDemoData();
                    }
                  }}
                  className="w-full text-xs h-9 bg-red-600 hover:bg-red-700 text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset to Philippine Demo Preset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddStaffOpen && (
        <Dialog open={isAddStaffOpen} onOpenChange={(open) => !open && setIsAddStaffOpen(false)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Add New Employee Account
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="staff-name" className="text-xs font-semibold">Employee Full Name</Label>
                <Input
                  id="staff-name"
                  required
                  placeholder="e.g. Maria Santos"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="staff-email" className="text-xs font-semibold">Email / Account ID</Label>
                <Input
                  id="staff-email"
                  type="email"
                  required
                  placeholder="e.g. maria@store.ph"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="staff-role" className="text-xs font-semibold">Assigned Role</Label>
                  <select
                    id="staff-role"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="CASHIER">Cashier (POS Sales)</option>
                    <option value="MANAGER">Store Manager</option>
                    <option value="INVENTORY_STAFF">Inventory Staff</option>
                    <option value="OWNER">Owner / Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="staff-pin" className="text-xs font-semibold">4-Digit Access PIN</Label>
                  <Input
                    id="staff-pin"
                    type="password"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="text-xs h-9 font-mono tracking-widest text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-900 text-[11px] leading-relaxed">
                Role defaults: <strong>Cashier</strong> can record sales and view customer utang, but requires Owner PIN to void sales or view confidential store profits.
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Create Staff Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
