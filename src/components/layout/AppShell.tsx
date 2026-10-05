"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { 
  ShoppingCart, 
  Package, 
  BookOpen, 
  Coins, 
  BarChart3, 
  Settings, 
  Store, 
  Wifi, 
  WifiOff, 
  User, 
  RefreshCw,
  Bell
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { POSView } from "@/components/pos/POSView";
import { InventoryView } from "@/components/inventory/InventoryView";
import { CreditView } from "@/components/credit/CreditView";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import { ReportsView } from "@/components/reports/ReportsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { QADemoHelper } from "@/components/layout/QADemoHelper";

export type NavTab = "pos" | "inventory" | "credit" | "expenses" | "reports" | "settings";

export function AppShell() {
  const { 
    settings, 
    currentStaff, 
    staffList, 
    switchStaff, 
    isOnline, 
    pendingSyncCount, 
    isSyncing, 
    syncCloud,
    products,
    customers,
    cashDrawer,
    isSupabaseActive
  } = useStore();

  const [activeTab, setActiveTab] = useState<NavTab>("pos");

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
  const utangCount = customers.filter((c) => c.totalDebt > 0).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Top Application Bar */}
      <header className="h-14 sm:h-16 bg-slate-900 text-white px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-md z-30">
        {/* Brand & Store Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-sm">
            P+
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white">
                {settings.storeName}
              </h1>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-300 border-none font-bold hidden sm:inline-flex">
                Peddlr Plus
              </Badge>
              {isSupabaseActive ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden md:inline-block">
                  ⚡ Supabase
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hidden md:inline-block">
                  💾 Local Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs">
              {settings.address}
            </p>
          </div>
        </div>

        {/* System Telemetry & Cashier Bar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Cash Drawer Float Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-xs border border-slate-700">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400">Cash in Box:</span>
            <span className="font-bold font-mono text-emerald-400">
              ₱{cashDrawer.expectedCash.toFixed(2)}
            </span>
          </div>

          {/* Cloud Sync Status */}
          <button
            onClick={syncCloud}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-slate-800/80 hover:bg-slate-800 transition border border-slate-700 text-slate-300"
            title="Click to trigger cloud synchronization"
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {isSyncing ? "Syncing..." : isOnline ? "Synced" : "Offline Queue"}
            </span>
            {pendingSyncCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1 rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Staff Switcher Dropdown */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={currentStaff.id}
              onChange={(e) => switchStaff(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main App Body with Sidebar / Bottom Navigation */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-56 xl:w-64 bg-slate-900 border-t border-slate-800 p-3 shrink-0 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 py-2">
            Operations & Sales
          </div>

          <button
            onClick={() => setActiveTab("pos")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "pos"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="h-4 w-4" />
              <span>POS Register</span>
            </div>
            <span className="text-[10px] opacity-75 font-mono">F1</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "inventory"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package className="h-4 w-4" />
              <span>Inventory & Stock</span>
            </div>
            {lowStockCount > 0 && (
              <Badge variant="secondary" className="bg-amber-400/20 text-amber-300 border-none text-[10px] px-1.5 py-0">
                {lowStockCount}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("credit")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "credit"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4" />
              <span>Credit Book (Utang)</span>
            </div>
            {utangCount > 0 && (
              <Badge variant="secondary" className="bg-amber-500 text-slate-950 font-bold border-none text-[10px] px-1.5 py-0">
                {utangCount}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "expenses"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Coins className="h-4 w-4" />
              <span>Cash & Expenses</span>
            </div>
          </button>

          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 pt-4 pb-2">
            Intelligence & Setup
          </div>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "reports"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4" />
              <span>Reports & P&L</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "settings"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4" />
              <span>Store Settings</span>
            </div>
          </button>

          {/* Bottom Sidebar Tag */}
          <div className="mt-auto pt-4 border-t border-slate-800 px-3 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300">Peddlr Plus Enterprise</p>
            <p className="text-[10px]">Cloud-First MSME POS</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
          {activeTab === "pos" && <POSView />}
          {activeTab === "inventory" && <InventoryView />}
          {activeTab === "credit" && <CreditView />}
          {activeTab === "expenses" && <ExpensesView />}
          {activeTab === "reports" && <ReportsView />}
          {activeTab === "settings" && <SettingsView />}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 py-2 shrink-0 z-20">
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "pos" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Register</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition relative ${
              activeTab === "inventory" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <Package className="h-5 w-5" />
            <span>Stock</span>
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("credit")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition relative ${
              activeTab === "credit" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Utang</span>
            {utangCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {utangCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "expenses" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <Coins className="h-5 w-5" />
            <span>Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "reports" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "settings" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* QA / Client Demo Walkthrough Playbook Floating Helper */}
      <QADemoHelper onNavigateTab={setActiveTab} />
    </div>
  );
}
