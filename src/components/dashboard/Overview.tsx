"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, BookOpen, ChevronRight, Package, Plus, ReceiptText, ShoppingBag, Sparkles, TrendingUp, Truck, Wallet } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { businessDate, netSale, peso, retainedCost } from "@/lib/commerce";
import { industryGuides } from "@/data/industryGuides";
import type { NavTab } from "@/components/layout/AppShell";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import type { Transaction } from "@/types";

export function Overview({ onNavigate }: { onNavigate: (tab: NavTab) => void }) {
  const { transactions, expenses, products, customers, settings, cashDrawer, currentShopPreset } = useStore();
  const [period, setPeriod] = useState<"today" | "week">("today");
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const today = businessDate();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return businessDate(d); });
  const sales = transactions.filter(t => period === "today" ? businessDate(t.createdAt) === today : businessDate(t.createdAt) >= days[0]);
  const net = sales.reduce((s, t) => s + netSale(t), 0);
  const cost = sales.reduce((s, t) => s + retainedCost(t), 0);
  const spent = expenses.filter(e => e.category !== "Supplier & Stock Restock" && e.category !== "Personal Drawings" && (period === "today" ? businessDate(e.date) === today : businessDate(e.date) >= days[0])).reduce((s, e) => s + e.amount, 0);
  const debt = customers.reduce((s, c) => s + c.totalDebt, 0);
  const low = products.filter(p => p.isActive && p.stock <= p.minStockAlert);
  const expired = products.filter(p => p.isActive && p.stock > 0 && p.expirationDate && p.expirationDate < today);
  const weekly = days.map(d => transactions.filter(t => businessDate(t.createdAt) === d).reduce((s, t) => s + netSale(t), 0));
  const max = Math.max(...weekly, 1);
  const points = weekly.map((v, i) => `${35 + i * 88},${160 - (v / max) * 125}`).join(" ");
  const guide = industryGuides[currentShopPreset];
  const recent = [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const tops = products.map(p => ({ ...p, revenue: transactions.reduce((s, t) => s + (["VOID", "VOIDED"].includes(t.status) ? 0 : t.items.filter(i => i.product.id === p.id).reduce((a, i) => a + i.subtotal * (t.subtotal ? netSale(t) / t.subtotal : 0), 0)), 0) })).sort((a, b) => b.revenue - a.revenue).filter(p => p.revenue > 0).slice(0, 4);
  return <div className="workspace-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR BUSINESS, AT A GLANCE</div><h1>Magandang araw! <span className="font-normal">☀</span></h1><p>Here’s how things are going at {settings.storeName}.</p></div><button className="primary-button" onClick={() => onNavigate("pos")}><Plus size={17} /> New sale</button></div>
    <div className="flex items-center justify-between gap-3"><div className="segmented"><button className={period === "today" ? "selected" : ""} onClick={() => setPeriod("today")}>Today</button><button className={period === "week" ? "selected" : ""} onClick={() => setPeriod("week")}>Last 7 days</button></div><span className="text-xs text-slate-500">{new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "short", day: "numeric", year: "numeric" })}</span></div>
    <div className="metric-grid">
      {[{ title: "Net sales", value: peso(net), note: sales.filter(t => !["VOID", "VOIDED"].includes(t.status)).length + " sales · after refunds", icon: ShoppingBag, color: "green" }, { title: "Estimated profit", value: peso(net - cost - spent), note: "After item costs & operating expenses", icon: TrendingUp, color: "purple" }, { title: "Cash in drawer", value: peso(cashDrawer.expectedCash), note: cashDrawer.status === "OPEN" ? "Current shift · expected balance" : "Shift closed · counted & reconciled", icon: Wallet, color: "orange" }, { title: "Customer utang", value: peso(debt), note: customers.filter(c => c.totalDebt > 0).length + " customers with an outstanding balance", icon: BookOpen, color: "blue" }].map(m => <div className="metric-card" key={m.title}><div className="flex items-center justify-between"><span>{m.title}</span><div className={"metric-icon " + m.color}><m.icon size={18} /></div></div><strong>{m.value}</strong><small>{m.note}</small></div>)}
    </div>
    <div className="overview-middle">
      <section className="panel"><div className="panel-heading"><div><h2>Sales performance</h2><p>A little progress, every day.</p></div><span className="subtle-tag"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Net sales · 7 days</span></div>
        <div className="flex items-end gap-3 px-6"><strong className="text-3xl tracking-tight">{peso(weekly.reduce((s, n) => s + n, 0))}</strong><span className="text-xs text-slate-400 pb-1">this week</span></div>
        <div className="px-5 pt-3"><svg viewBox="0 0 600 205" className="w-full h-[210px]" role="img" aria-label={"Seven-day net sales: " + weekly.map((v, i) => days[i] + ": " + peso(v)).join(", ")}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".2" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>{[35, 77, 119, 160].map(y => <line key={y} x1="30" x2="565" y1={y} y2={y} stroke="#e8efed" strokeDasharray="4 5" />)}<polygon points={"35,160 " + points + " 563,160"} fill="url(#salesFill)" /><polyline points={points} fill="none" stroke="#159777" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{weekly.map((v, i) => <g key={days[i]}><circle cx={35 + i * 88} cy={160 - v / max * 125} r="4" fill="#fff" stroke="#159777" strokeWidth="2"><title>{days[i]}: {peso(v)}</title></circle><text x={35 + i * 88} y="190" textAnchor="middle" fill="#81918d" fontSize="11">{new Date(days[i] + "T12:00:00+08:00").toLocaleDateString("en", { weekday: "short" })}</text></g>)}</svg></div>
      </section>
      <section className="panel attention-panel"><div className="panel-heading"><div><h2>Needs your attention</h2><p>Small actions. A healthier business.</p></div><span className="count-badge">{(low.length > 0 ? 1 : 0) + (expired.length > 0 ? 1 : 0) + (debt > 0 ? 1 : 0)}</span></div>
        <button className="attention-row" onClick={() => onNavigate("purchases")}><span className="metric-icon orange"><Package size={19} /></span><span><strong>{low.length} items to restock</strong><small>{low.length ? low.slice(0, 2).map(p => p.name).join(", ") : "Your stock levels look healthy"}</small></span><ChevronRight size={16} /></button>
        <button className="attention-row" onClick={() => onNavigate("credit")}><span className="metric-icon blue"><ArrowDownLeft size={19} /></span><span><strong>{peso(debt)} to collect</strong><small>Keep in touch with your regular customers</small></span><ChevronRight size={16} /></button>
        <button className="attention-row" onClick={() => onNavigate(expired.length ? "inventory" : "expenses")}><span className="metric-icon purple">{expired.length ? <Package size={19} /> : <Banknote size={19} />}</span><span><strong>{expired.length ? expired.length + " expired products" : "Make every peso count"}</strong><small>{expired.length ? "Blocked from checkout · review your shelves" : "Record expenses and reconcile your shift"}</small></span><ChevronRight size={16} /></button>
        <div className="attention-tip"><Sparkles size={16} /><p>{guide.tip}</p></div>
      </section>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-5">
      <section className="panel overflow-hidden"><div className="panel-heading"><div><h2>Recent sales</h2><p>Your latest counter activity.</p></div><button className="text-link" onClick={() => onNavigate("history")}>View all <ArrowUpRight size={15} /></button></div><div className="overflow-x-auto"><table className="clean-table"><thead><tr><th>Receipt / customer</th><th>Payment</th><th>Amount</th><th></th></tr></thead><tbody>{recent.map(t => <tr key={t.id}><td><button onClick={() => setReceipt(t)} className="text-left"><strong>{t.receiptNumber}</strong><small>{t.customerName || "Walk-in customer"} · {new Date(t.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</small></button></td><td><span className={"payment-tag " + (t.paymentMethod === "CREDIT_UTANG" ? "utang" : "")}>{t.paymentMethod.replace("CREDIT_UTANG", "Utang").replaceAll("_", " ")}</span></td><td className="font-semibold">{peso(netSale(t))}</td><td><button aria-label={"View receipt " + t.receiptNumber} className="icon-button" onClick={() => setReceipt(t)}><ArrowUpRight size={16} /></button></td></tr>)}</tbody></table>{!recent.length && <div className="empty-state"><ReceiptText /><h3>Your first sale starts here</h3><p>Complete a checkout to see it in your activity.</p><button className="text-link" onClick={() => onNavigate("pos")}>Open register <ArrowRight size={15} /></button></div>}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Customer favorites</h2><p>Top products by net sales · all time.</p></div><ShoppingBag size={20} className="text-slate-400" /></div>{tops.map((p, i) => <div className="favorite-row" key={p.id}><span className="text-xs text-slate-400 w-3">{i + 1}</span><span className="product-symbol">{p.emoji}</span><div className="min-w-0 flex-1"><strong className="block text-sm truncate">{p.name}</strong><small className="text-slate-500">{p.stock} {p.unit} in stock</small></div><span className="text-sm font-semibold">{peso(p.revenue)}</span></div>)}{!tops.length && <p className="px-6 pb-6 text-sm text-slate-500">Your bestsellers will appear after your first sale.</p>}</section>
    </div>
    <div className="industry-banner"><span className="metric-icon green"><Sparkles size={22} /></span><div className="flex-1"><span className="eyebrow">MADE FOR YOUR BUSINESS</span><h3>{guide.workflow}</h3><p>{guide.short} Explore the full workflow in your industry demo.</p></div><button className="secondary-button" onClick={() => onNavigate("purchases")}><Truck size={16} /> Receive stock</button></div>
    {receipt && <ReceiptModal transaction={receipt} settings={settings} isOpen onClose={() => setReceipt(null)} isCopy />}
  </div>;
}
