"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, BarChart3, BookOpen, ChevronDown, CircleHelp, Coins, HardDrive, LayoutDashboard, LockKeyhole, Menu, Package, Plus, ReceiptText, Search, Settings, ShoppingBag, Sparkles, Store, Truck, Users, WifiOff, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Overview } from "@/components/dashboard/Overview";
import { POSView } from "@/components/pos/POSView";
import { InventoryView } from "@/components/inventory/InventoryView";
import { CreditView } from "@/components/credit/CreditView";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import { ReportsView } from "@/components/reports/ReportsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { PurchaseView } from "@/components/inventory/PurchaseView";
import { SalesHistory } from "@/components/reports/SalesHistory";
import { BackupPanel } from "@/components/settings/BackupPanel";
import { PinPadModal } from "./PinPadModal";
import { LoginModal } from "@/components/auth/LoginModal";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { PresetModal } from "./PresetModal";
import { industryGuides } from "@/data/industryGuides";
import type { StaffPermissions } from "@/types";

export type NavTab = "dashboard" | "pos" | "inventory" | "credit" | "expenses" | "reports" | "settings" | "purchases" | "history";
const navigation = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { id: "pos", label: "Point of sale", icon: ShoppingBag },
  { id: "history", label: "Sales history", icon: ReceiptText },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "purchases", label: "Purchases", icon: Truck },
  { id: "credit", label: "Customers & utang", icon: BookOpen, group: "MANAGE" },
  { id: "expenses", label: "Cash & expenses", icon: Coins },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
export function AppShell() {
  const store = useStore();
  const { settings, currentStaff, currentShopPreset, products, isOnline, isAuthenticated, mounted, verifyOwnerPin, hasPermission, logout } = store;
  const [activeTab, setTab] = useState<NavTab>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [pending, setPending] = useState<NavTab | null>(null);
  const [help, setHelp] = useState(false);
  const [command, setCommand] = useState(false);
  const [search, setSearch] = useState("");
  const guide = industryGuides[currentShopPreset];
  const low = products.filter(p => p.isActive && p.stock <= p.minStockAlert).length;
  function navigate(tab: NavTab) {
    const permission: Partial<Record<NavTab, keyof StaffPermissions>> = { settings: "canManageSettings", reports: "canViewReports", dashboard: "canViewReports", purchases: "canManageInventory" };
    if (permission[tab] && !hasPermission(permission[tab]!)) { setPending(tab); return; }
    setTab(tab); setMobileNav(false); setCommand(false); setHelp(false);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommand(v => !v); }
      if (e.key === "Escape") { setCommand(false); setMobileNav(false); setHelp(false); }
      if (e.key === "F1") { e.preventDefault(); setTab("pos"); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => { setTab(currentStaff.role === "OWNER" || currentStaff.role === "MANAGER" ? "dashboard" : "pos"); }, [currentStaff.id, currentShopPreset]);
  if (!mounted) return <div className="h-dvh grid place-items-center bg-[#f5f7f6] text-emerald-800">Opening your workspace…</div>;
  if (!isAuthenticated) return <LoginScreen />;
  return <div className={"app-frame " + (settings.fontSizeMode === "LARGE" ? "font-mode-large" : "")}>
    {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileNav(false)} />}
    <aside className={"app-sidebar " + (mobileNav ? "mobile-open" : "")}>
      <div className="brand"><span className="brand-mark">p<span>·</span></span><span>paddl<span className="text-emerald-400">.</span></span><span className="brand-badge">FOR BUSINESS</span></div>
      <button className="store-switcher" onClick={() => setPresetOpen(true)}><span className="store-icon"><Store size={19} /></span><span className="min-w-0 flex-1 text-left"><strong>{settings.storeName}</strong><small>{guide.title}</small></span><ChevronDown size={15} /></button>
      <div className="sidebar-nav">{navigation.map(item => <div key={item.id}>{"group" in item && <div className="nav-group">{item.group}</div>}<button className={"nav-item " + (activeTab === item.id ? "active" : "")} onClick={() => navigate(item.id)}><item.icon size={19} /><span>{item.label}</span>{item.id === "inventory" && low > 0 && <span className="nav-count">{low}</span>}{item.id === "pos" && <kbd>F1</kbd>}</button></div>)}</div>
      <button className="demo-callout" onClick={() => setPresetOpen(true)}><Sparkles size={19} /><div><strong>One app. Your kind of business.</strong><span>Explore 4 industry demos <ArrowUpRight size={13} /></span></div></button>
      <button className="sidebar-help" onClick={() => setHelp(v => !v)}><CircleHelp size={18} /> Your demo guide <ArrowUpRight size={14} /></button>
      <div className="sidebar-person"><button onClick={() => setStaffOpen(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left"><span className="avatar">{currentStaff.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span><span><strong>{currentStaff.name}</strong><small>{currentStaff.role.replaceAll("_", " ").toLowerCase()}</small></span></button><button aria-label="Lock terminal" title="Lock terminal" onClick={logout}><LockKeyhole size={17} /></button></div>
    </aside>
    <div className="app-main">
      <header className="app-header"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="icon-button md:hidden" onClick={() => setMobileNav(true)}><Menu size={21} /></button><span className="hidden sm:block text-slate-400 text-sm">Workspace</span><span className="hidden sm:block text-slate-300">/</span><strong className="text-sm">{navigation.find(n => n.id === activeTab)?.label}</strong></div><div className="flex items-center gap-3"><button className="header-search" onClick={() => setCommand(true)}><Search size={16} /><span>Go to…</span><kbd>Ctrl K</kbd></button><button className="device-status" onClick={() => navigate("settings")} title="Backup and connection status">{isOnline ? <HardDrive size={14} /> : <WifiOff size={14} />}<span className="hidden sm:inline">{store.syncStatus === "synced" ? "Backed up" : store.syncStatus === "syncing" ? "Backing up…" : !isOnline ? "Offline · local" : "Saved on device"}</span></button><button className="demo-pill" onClick={() => setPresetOpen(true)}><span /> Demo workspace</button></div></header>
      {!isOnline && <div className="connection-banner">You’re offline. This open workspace can still save on your device. Cloud backup needs a connection.</div>}
      <main className="app-content" key={currentShopPreset}>
        {activeTab === "dashboard" && <Overview onNavigate={navigate} />}
        {activeTab === "pos" && <POSView />}
        {activeTab === "inventory" && <InventoryView />}
        {activeTab === "credit" && <CreditView />}
        {activeTab === "expenses" && <ExpensesView />}
        {activeTab === "purchases" && <PurchaseView />}
        {activeTab === "history" && <SalesHistory />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "settings" && <div className="flex flex-col flex-1 overflow-y-auto"><BackupPanel /><SettingsView /></div>}
      </main>
      <nav className="mobile-tabs">{navigation.filter(n => ["dashboard", "pos", "inventory", "credit"].includes(n.id)).map(n => <button key={n.id} className={activeTab === n.id ? "active" : ""} onClick={() => navigate(n.id)}><n.icon size={20} /><span>{n.id === "credit" ? "Utang" : n.label}</span></button>)}<button onClick={() => setMobileNav(true)}><Menu size={20} /><span>More</span></button></nav>
    </div>
    {help && <div className="guide-popover"><button className="absolute right-3 top-3 icon-button" aria-label="Close guide" onClick={() => setHelp(false)}><X size={18} /></button><span className="eyebrow">A 3-MINUTE WALKTHROUGH</span><h2>{guide.title}</h2><p>Try these steps in your saved demo workspace.</p>{guide.steps.map((step, i) => <button key={step} onClick={() => navigate((["pos", "pos", "credit", "purchases"] as NavTab[])[i])}><span>{i + 1}</span>{step}<ChevronDown size={14} className="-rotate-90 ml-auto" /></button>)}<small>Each industry keeps its own products, sales, and held orders.</small></div>}
    {command && <div className="command-backdrop" onClick={() => setCommand(false)}><div role="dialog" aria-modal="true" aria-label="Go to workspace" className="command-panel" onClick={e => e.stopPropagation()}><div className="flex items-center gap-3 p-4 border-b"><Search size={19} /><input aria-label="Search pages" autoFocus placeholder="Where would you like to go?" value={search} onChange={e => setSearch(e.target.value)} /><button className="icon-button" aria-label="Close search" onClick={() => setCommand(false)}><X size={18} /></button></div>{navigation.filter(n => n.label.toLowerCase().includes(search.toLowerCase())).map(n => <button key={n.id} onClick={() => navigate(n.id)}><n.icon size={18} />{n.label}<ArrowUpRight size={15} className="ml-auto" /></button>)}</div></div>}
    {pending && <PinPadModal isOpen onClose={() => setPending(null)} onSuccess={() => { setTab(pending); setPending(null); }} verifyPin={verifyOwnerPin} targetFeatureName={navigation.find(n => n.id === pending)?.label || ""} />}
    {staffOpen && <LoginModal isOpen onClose={() => setStaffOpen(false)} />}
    {presetOpen && <PresetModal isOpen onClose={() => setPresetOpen(false)} />}
  </div>;
}
