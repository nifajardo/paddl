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
  Bell,
  Lock,
  Shield,
  LayoutDashboard,
  LogIn,
  LogOut
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { POSView } from "@/components/pos/POSView";
import { InventoryView } from "@/components/inventory/InventoryView";
import { CreditView } from "@/components/credit/CreditView";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import { ReportsView } from "@/components/reports/ReportsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { QADemoHelper } from "@/components/layout/QADemoHelper";
import { PinPadModal } from "@/components/layout/PinPadModal";
import { LoginModal } from "@/components/auth/LoginModal";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { PresetModal } from "@/components/layout/PresetModal";
import { ALL_SHOP_PRESETS } from "@/data/shopPresets";

export type NavTab = "dashboard" | "pos" | "inventory" | "credit" | "expenses" | "reports" | "settings";

export function AppShell() {
  const { 
    settings, 
    currentStaff, 
    staffList, 
    switchStaff, 
    verifyOwnerPin,
    isOnline, 
    pendingSyncCount, 
    isSyncing, 
    syncCloud,
    syncStatus,
    products,
    customers,
    cashDrawer,
    isSupabaseActive,
    isAuthenticated,
    logout,
    currentShopPreset
  } = useStore();

  const [activeTab, setActiveTab] = useState<NavTab>("pos");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<NavTab | null>(null);
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);

  // Authentication Guard: Do NOT expose store if unauthenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
  const utangCount = customers.filter((c) => c.totalDebt > 0).length;

  const isRestrictedCashier = currentStaff.role === "CASHIER" && !isOwnerUnlocked;

  const handleTabClick = (tab: NavTab) => {
    if ((tab === "reports" || tab === "settings") && isRestrictedCashier) {
      setPendingTab(tab);
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handlePinSuccess = () => {
    setIsOwnerUnlocked(true);
    setIsPinModalOpen(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleStaffChange = (staffId: string) => {
    switchStaff(staffId);
    setIsOwnerUnlocked(false);
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden bg-slate-100 ${settings.fontSizeMode === "LARGE" ? "font-mode-large" : ""}`}>
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
                Paddl+ Pro
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

          {/* Multi-Device Real-time Sync Indicator */}
          <button
            onClick={syncCloud}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-800 hover:bg-slate-700 transition border border-slate-700 text-slate-300 shadow-sm"
            title="Click to trigger instant cloud synchronization across all devices"
          >
            {syncStatus === "synced" ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">● Synced</span>
              </span>
            ) : syncStatus === "syncing" ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">↻ Syncing...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline">⚠ Offline</span>
              </span>
            )}
            {pendingSyncCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Business Dataset Switcher */}
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs border border-slate-700 text-slate-200 transition"
            title="Switch Shop Test Dataset"
          >
            <span className="text-sm">{ALL_SHOP_PRESETS[currentShopPreset]?.icon || "🏪"}</span>
            <span className="font-semibold text-[11px] hidden lg:inline">
              {ALL_SHOP_PRESETS[currentShopPreset]?.name || "Shop Template"}
            </span>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[9px] px-1 py-0">
              Template
            </Badge>
          </button>

          {/* User Profile / Cashier Login & Switcher */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-white transition cursor-pointer"
            title="Switch Cashier Profile or Sign In with Supabase"
          >
            <div className="h-5 w-5 rounded-full bg-emerald-600 text-[10px] font-bold flex items-center justify-center text-white">
              {currentStaff.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-xs leading-none block">{currentStaff.name}</span>
              <span className="text-[9px] text-slate-400 leading-none block font-mono">{currentStaff.role}</span>
            </div>
            <LogIn className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Lock Terminal / Log Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 px-2.5 py-1 rounded-lg text-xs text-rose-300 transition"
            title="Lock Terminal / Log Out"
          >
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline font-semibold text-[11px]">Lock</span>
          </button>
        </div>
      </header>

      {/* Main App Body with Sidebar / Bottom Navigation */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-56 xl:w-64 bg-slate-900 border-t border-slate-800 p-3 shrink-0 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 py-2">
            Store Operations
          </div>

          <button
            onClick={() => handleTabClick("dashboard")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "dashboard"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard Overview</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick("pos")}
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
            onClick={() => handleTabClick("inventory")}
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
            onClick={() => handleTabClick("credit")}
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
            onClick={() => handleTabClick("expenses")}
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
            onClick={() => handleTabClick("reports")}
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
            {isRestrictedCashier && (
              <span title="Protected by Owner PIN">
                <Lock className="h-3 w-3 text-amber-400" />
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabClick("settings")}
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
            {isRestrictedCashier && (
              <span title="Protected by Owner PIN">
                <Lock className="h-3 w-3 text-amber-400" />
              </span>
            )}
          </button>

          {/* Bottom Sidebar Tag */}
          <div className="mt-auto pt-4 border-t border-slate-800 px-3 text-[11px] text-slate-400">
            <p className="font-semibold text-emerald-400">Paddl+ Pro Enterprise</p>
            <p className="text-[10px] text-slate-500">The Unstoppable PH Cloud POS</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
          {activeTab === "dashboard" && <ExecutiveDashboard onNavigateTab={handleTabClick} />}
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
            onClick={() => handleTabClick("dashboard")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "dashboard" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => handleTabClick("pos")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "pos" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Register</span>
          </button>

          <button
            onClick={() => handleTabClick("inventory")}
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
            onClick={() => handleTabClick("credit")}
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
            onClick={() => handleTabClick("expenses")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition ${
              activeTab === "expenses" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <Coins className="h-5 w-5" />
            <span>Expenses</span>
          </button>

          <button
            onClick={() => handleTabClick("reports")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition relative ${
              activeTab === "reports" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Reports</span>
            {isRestrictedCashier && (
              <Lock className="h-2.5 w-2.5 text-amber-400 absolute top-0 right-3" />
            )}
          </button>

          <button
            onClick={() => handleTabClick("settings")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition relative ${
              activeTab === "settings" ? "text-emerald-400 font-bold" : "text-slate-400"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
            {isRestrictedCashier && (
              <Lock className="h-2.5 w-2.5 text-amber-400 absolute top-0 right-3" />
            )}
          </button>
        </nav>
      </div>

      {/* QA / Client Demo Walkthrough Playbook Floating Helper */}
      <QADemoHelper onNavigateTab={handleTabClick} />

      {/* Owner PIN Authorization Modal */}
      {isPinModalOpen && (
        <PinPadModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setPendingTab(null);
          }}
          onSuccess={handlePinSuccess}
          verifyPin={verifyOwnerPin}
          targetFeatureName={pendingTab === "reports" ? "Financial Reports & P&L" : "Store Settings & Security"}
        />
      )}

      {/* CASHIER LOGIN / PIN SWITCHER MODAL */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* BUSINESS TEST DATASET PRESET SWITCHER MODAL */}
      {isPresetModalOpen && (
        <PresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
        />
      )}
    </div>
  );
}
