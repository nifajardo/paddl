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
  Server
} from "lucide-react";

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

  const [savedSuccess, setSavedSuccess] = useState(false);
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

          {/* Multi-User & Role Management */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Multi-User Staff & Role Permissions</h3>
                </div>
                <Badge variant="secondary" className="text-[11px] bg-indigo-50 text-indigo-700">
                  Active Cashier: {currentStaff.name}
                </Badge>
              </div>

              <p className="text-xs text-slate-500">
                Unlike Peddlr (which is single-device/single-user), Peddlr Plus supports role-based team management across all your tablets and phones:
              </p>

              <div className="space-y-2">
                {staffList.map((st) => (
                  <div
                    key={st.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition ${
                      st.id === currentStaff.id ? "bg-indigo-50/60 border-indigo-300" : "bg-white border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{st.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            st.role === "OWNER"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : st.role === "MANAGER"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {st.role}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{st.email}</p>
                    </div>

                    <div>
                      {st.id === currentStaff.id ? (
                        <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Current User
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => switchStaff(st.id)}
                          className="text-xs"
                        >
                          Switch to this Staff
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
