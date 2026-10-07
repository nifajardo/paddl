"use client";

import React, { useMemo, useState } from "react";
import { netSale, retainedCost } from "@/lib/commerce";
import { useStore } from "@/context/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  Clock, 
  Ban, 
  RotateCcw, 
  Calendar, 
  Coins, 
  ArrowUpRight, 
  DollarSign, 
  Users, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldAlert,
  Layers,
  Sparkles
} from "lucide-react";
import { ZReadingModal } from "@/components/reports/ZReadingModal";

interface ExecutiveDashboardProps {
  onNavigateTab: (tab: "pos" | "inventory" | "credit" | "expenses" | "reports" | "settings") => void;
}

export function ExecutiveDashboard({ onNavigateTab }: ExecutiveDashboardProps) {
  const { 
    transactions, 
    products, 
    expenses, 
    customers, 
    cashDrawer, 
    settings, 
    currentStaff, 
    returnRecords,
    auditLogs,
    syncStatus,
    isOnline,
    isSyncing,
    syncCloud
  } = useStore();

  const [isZReadingOpen, setIsZReadingOpen] = useState(false);

  const summarySales = transactions.filter(t => !["VOID", "VOIDED"].includes(t.status));
  const summaryNet = summarySales.reduce((sum, t) => sum + netSale(t), 0);
  const summaryCost = summarySales.reduce((sum, t) => sum + retainedCost(t), 0);
  const summaryExpenses = expenses.filter(e => !["Supplier & Stock Restock", "Personal Drawings"].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);
  const summaryTenders: Record<string, number> = {};
  for (const t of summarySales) {
    if (t.paymentMethod === "SPLIT" && t.splitDetail) {
      const ratio = t.total ? netSale(t) / t.total : 0;
      summaryTenders.CASH = (summaryTenders.CASH || 0) + t.splitDetail.cashAmount * ratio;
      summaryTenders[t.splitDetail.digitalMethod] = (summaryTenders[t.splitDetail.digitalMethod] || 0) + t.splitDetail.digitalAmount * ratio;
    } else summaryTenders[t.paymentMethod] = (summaryTenders[t.paymentMethod] || 0) + netSale(t);
  }

  // Time calculations for "Today"
  const todayMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000 - 1;

    const todayTxns = transactions.filter((t) => {
      const tTime = new Date(t.createdAt).getTime();
      return tTime >= startOfToday && tTime <= endOfToday;
    });

    const validTodayTxns = todayTxns.filter((t) => t.status !== "VOID" && t.status !== "VOIDED");
    const voidedTodayTxns = todayTxns.filter((t) => t.status === "VOID" || t.status === "VOIDED");

    const grossSalesToday = validTodayTxns.reduce((sum, t) => sum + t.total, 0);
    const itemsSoldToday = validTodayTxns.reduce(
      (sum, t) => sum + t.items.reduce((iSum, i) => iSum + i.quantity, 0),
      0
    );

    // Voids amount
    const voidAmountToday = voidedTodayTxns.reduce((sum, t) => sum + t.total, 0);

    // Returns today
    const returnsToday = returnRecords.filter((r) => {
      const rTime = new Date(r.timestamp || r.createdAt).getTime();
      return rTime >= startOfToday && rTime <= endOfToday;
    });
    const refundAmountToday = returnsToday.reduce((sum, r) => sum + (r.refundAmount ?? r.totalRefundAmount ?? 0), 0);

    return {
      todayTxnsCount: todayTxns.length,
      validTxnsCount: validTodayTxns.length,
      grossSalesToday,
      itemsSoldToday,
      voidsCount: voidedTodayTxns.length,
      voidAmountToday,
      returnsCount: returnsToday.length,
      refundAmountToday,
    };
  }, [transactions, returnRecords]);

  // Inventory Health: Low stock & Expiring soon
  const inventoryHealth = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDays = settings.expirationWarningDays || 30;

    let lowStock = 0;
    let outOfStock = 0;
    let expired = 0;
    let expiringSoon = 0;

    products.forEach((p) => {
      if (p.stock <= 0) {
        outOfStock++;
      } else if (p.stock <= p.minStockAlert) {
        lowStock++;
      }

      if (p.expirationDate) {
        const exp = new Date(p.expirationDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expired++;
        } else if (diffDays <= warningDays) {
          expiringSoon++;
        }
      }
    });

    return { lowStock, outOfStock, expired, expiringSoon };
  }, [products, settings.expirationWarningDays]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Top Banner: Greeting, Store Name, and Real-time Sync Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Mabuhay, {currentStaff.name}!
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
              {currentStaff.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {settings.storeName} • Executive Daily Overview & Store Control
          </p>
        </div>

        {/* Sync Status Badge & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold">
            {syncStatus === "synced" ? (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                ● Synced
              </span>
            ) : syncStatus === "syncing" ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                ↻ Syncing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-600">
                <WifiOff className="h-3 w-3" />
                ⚠ Offline
              </span>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => onNavigateTab("pos")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Open Register
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsZReadingOpen(true)}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs h-9 font-semibold gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Z-Reading Audit
          </Button>
        </div>
      </div>

      {/* 7 Key Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* 1. Today's Sales */}
        <Card className="bg-white border-slate-200 hover:border-emerald-300 transition shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Today's Sales
              </span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              ₱{todayMetrics.grossSalesToday.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Clean revenue today
            </div>
          </CardContent>
        </Card>

        {/* 2. Transactions */}
        <Card className="bg-white border-slate-200 hover:border-blue-300 transition shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Transactions
              </span>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {todayMetrics.validTxnsCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Completed sales
            </div>
          </CardContent>
        </Card>

        {/* 3. Items Sold */}
        <Card className="bg-white border-slate-200 hover:border-purple-300 transition shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Items Sold
              </span>
              <Package className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {todayMetrics.itemsSoldToday}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Units across carts
            </div>
          </CardContent>
        </Card>

        {/* 4. Low Stock */}
        <Card
          className="bg-white border-slate-200 hover:border-amber-300 transition shadow-none cursor-pointer"
          onClick={() => onNavigateTab("inventory")}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Low Stock
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-700 mt-1 flex items-center gap-1.5">
              <span>{inventoryHealth.lowStock}</span>
              <span className="text-xs text-rose-600 font-semibold">({inventoryHealth.outOfStock} out)</span>
            </div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-0.5">
              Click to reorder <ChevronRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* 5. Expiring Soon */}
        <Card
          className="bg-white border-slate-200 hover:border-rose-300 transition shadow-none cursor-pointer"
          onClick={() => onNavigateTab("inventory")}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Near Expiry
              </span>
              <Clock className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-700 mt-1 flex items-center gap-1.5">
              <span>{inventoryHealth.expiringSoon}</span>
              {inventoryHealth.expired > 0 && (
                <span className="text-xs text-rose-950 font-bold bg-rose-100 px-1 rounded">
                  {inventoryHealth.expired} exp
                </span>
              )}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              In next 30 days
            </div>
          </CardContent>
        </Card>

        {/* 6. Voids Today */}
        <Card className="bg-white border-slate-200 hover:border-slate-300 transition shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Voided Sales
              </span>
              <Ban className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-800 mt-1">
              {todayMetrics.voidsCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              ₱{todayMetrics.voidAmountToday.toFixed(2)} canceled
            </div>
          </CardContent>
        </Card>

        {/* 7. Returns / Refunds */}
        <Card className="bg-white border-slate-200 hover:border-amber-300 transition shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Refunds
              </span>
              <RotateCcw className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-800 mt-1">
              {todayMetrics.returnsCount}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">
              ₱{todayMetrics.refundAmountToday.toFixed(2)} refunded
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Live Financial Pulse & Quick Action Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash Drawer & Operational Short-cuts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cash Drawer Status Card */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Cash Drawer & Shift Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated cash from sales, initial shift float, and recorded disbursements
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("expenses")}
                  className="text-xs h-8 text-slate-700"
                >
                  Manage Float / Outflow
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Starting Float:</span>
                  <span className="text-base font-bold text-slate-800">
                    ₱{(cashDrawer.startingFloat ?? cashDrawer.openingCash ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 block">Expected Cash in Drawer:</span>
                  <span className="text-lg font-black text-emerald-700">
                    ₱{cashDrawer.expectedCash.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[11px] text-blue-800 block">Cash Sales Today:</span>
                  <span className="text-base font-bold text-blue-700">
                    ₱{todayMetrics.grossSalesToday.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales Live Feed */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Recent Store Transactions
                </h3>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onNavigateTab("reports")}
                  className="text-xs text-emerald-700 font-semibold"
                >
                  View Full History <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {recentTransactions.map((t) => {
                  const isVoided = t.status === "VOID" || t.status === "VOIDED";

                  return (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 transition px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 font-mono text-[11px]">
                          {t.paymentMethod === "CASH" ? "₱" : t.paymentMethod === "SPLIT" ? "½" : "G"}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{t.receiptNumber}</span>
                            {isVoided && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 bg-rose-600">
                                VOIDED
                              </Badge>
                            )}
                            {t.status === "REFUNDED" && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-800 border border-purple-200">
                                REFUNDED
                              </Badge>
                            )}
                            {t.status === "PARTIALLY_RETURNED" && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-800 border border-amber-200">
                                PARTIAL RETURN
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {t.cashierName} • {new Date(t.createdAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} • {t.items.length} item(s)
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-black text-sm ${isVoided ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          ₱{t.total.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block uppercase">{t.paymentMethod}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Quick Store Shortcuts & Audit Pulse */}
        <div className="space-y-4">
          {/* Quick Operation Launchers */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Quick Actions
              </h3>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <button
                  onClick={() => onNavigateTab("pos")}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-900">New Cash / GCash Sale</div>
                      <span className="text-[11px] text-slate-400">Scan barcode or punch products</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition" />
                </button>

                <button
                  onClick={() => onNavigateTab("inventory")}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="h-4 w-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-slate-900">Add Stock / Barcode Labels</div>
                      <span className="text-[11px] text-slate-400">Wholesale restock & shelf printing</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition" />
                </button>

                <button
                  onClick={() => onNavigateTab("credit")}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-bold text-slate-900">Customer Utang Book</div>
                      <span className="text-[11px] text-slate-400">Record payments or manage limits</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
                </button>

                <button
                  onClick={() => onNavigateTab("expenses")}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-bold text-slate-900">Record Store Expense</div>
                      <span className="text-[11px] text-slate-400">Rent, electricity, supplies</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Pulse */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-emerald-600" />
                  Live Security Audit Pulse
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp || log.createdAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      By: <span className="font-medium text-slate-700">{log.staffName}</span> ({log.staffRole})
                      {log.targetReceiptNumber && ` • Receipt #${log.targetReceiptNumber}`}
                    </div>
                    {log.reason && (
                      <div className="text-[10px] text-slate-600 italic">"{log.reason}"</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Z-Reading Modal */}
      {isZReadingOpen && (
        <ZReadingModal
          isOpen={isZReadingOpen}
          onClose={() => setIsZReadingOpen(false)}
          settings={settings}
          periodLabel="All time"
          cashDrawer={cashDrawer}
          cashierName={currentStaff.name}
          transactions={summarySales}
          expenses={expenses}
          grossSales={summarySales.reduce((sum, t) => sum + t.total, 0)}
          totalDiscount={summarySales.reduce((sum, t) => sum + t.discountAmount, 0)}
          cogs={summaryCost}
          grossProfit={summaryNet - summaryCost}
          operatingExpenses={summaryExpenses}
          netProfit={summaryNet - summaryCost - summaryExpenses}
          paymentBreakdown={summaryTenders}
        />
      )}
    </div>
  );
}
