"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  Receipt, 
  Calendar, 
  ArrowUpRight, 
  CreditCard, 
  ShoppingBag,
  ShieldCheck,
  Download
} from "lucide-react";

export function ReportsView() {
  const { transactions, expenses, products, settings } = useStore();

  const [timeframe, setTimeframe] = useState<"TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL_TIME">("ALL_TIME");

  // Filter transactions and expenses by timeframe
  const { filteredTxns, filteredExpenses } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const sevenDaysAgo = now.getTime() - 7 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const txns = transactions.filter((t) => {
      if (t.status === "VOID") return false;
      const tTime = new Date(t.createdAt).getTime();

      if (timeframe === "TODAY") return tTime >= startOfToday;
      if (timeframe === "YESTERDAY") return tTime >= startOfYesterday && tTime < startOfToday;
      if (timeframe === "LAST_7_DAYS") return tTime >= sevenDaysAgo;
      if (timeframe === "THIS_MONTH") return tTime >= startOfMonth;
      return true;
    });

    const exps = expenses.filter((e) => {
      const eTime = new Date(e.date).getTime();
      if (timeframe === "TODAY") return eTime >= startOfToday;
      if (timeframe === "YESTERDAY") return eTime >= startOfYesterday && eTime < startOfToday;
      if (timeframe === "LAST_7_DAYS") return eTime >= sevenDaysAgo;
      if (timeframe === "THIS_MONTH") return eTime >= startOfMonth;
      return true;
    });

    return { filteredTxns: txns, filteredExpenses: exps };
  }, [transactions, expenses, timeframe]);

  // Core Financial Metrics
  const grossSales = useMemo(() => {
    return filteredTxns.reduce((sum, t) => sum + t.total, 0);
  }, [filteredTxns]);

  const totalDiscount = useMemo(() => {
    return filteredTxns.reduce((sum, t) => sum + t.discountAmount, 0);
  }, [filteredTxns]);

  // Cost of Goods Sold (COGS)
  const cogs = useMemo(() => {
    return filteredTxns.reduce((sum, t) => {
      const txnCost = t.items.reduce((iSum, item) => {
        const prod = products.find((p) => p.id === item.product.id) || item.product;
        return iSum + (prod.costPrice || 0) * item.quantity;
      }, 0);
      return sum + txnCost;
    }, 0);
  }, [filteredTxns, products]);

  const grossProfit = grossSales - cogs;
  const grossMarginPercent = grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : "0.0";

  const totalOperatingExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Net Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : "0.0";

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { CASH: 0, GCASH: 0, MAYA: 0, CREDIT_UTANG: 0 };
    filteredTxns.forEach((t) => {
      map[t.paymentMethod] = (map[t.paymentMethod] || 0) + t.total;
    });
    return map;
  }, [filteredTxns]);

  // Top Selling Items
  const topSellers = useMemo(() => {
    const itemMap: Record<string, { product: any; qty: number; revenue: number }> = {};
    filteredTxns.forEach((t) => {
      t.items.forEach((item) => {
        if (!itemMap[item.product.id]) {
          itemMap[item.product.id] = { product: item.product, qty: 0, revenue: 0 };
        }
        itemMap[item.product.id].qty += item.quantity;
        itemMap[item.product.id].revenue += item.subtotal;
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTxns]);

  const handleExportReportCSV = () => {
    const headers = "ReceiptNumber,Date,Customer,Cashier,PaymentMethod,Total,Discount,Status\n";
    const rows = filteredTxns
      .map(
        (t) =>
          `"${t.receiptNumber}","${t.createdAt}","${t.customerName || "Walk-in"}","${
            t.cashierName
          }","${t.paymentMethod}",${t.total},${t.discountAmount},"${t.status}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `peddlr_sales_report_${timeframe.toLowerCase()}.csv`;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Header and Timeframe Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Financial Reports & P&L Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Transparent revenue, cost of goods sold, profit margins, and sales ledger
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            <Button
              variant={timeframe === "TODAY" ? "default" : "ghost"}
              size="xs"
              onClick={() => setTimeframe("TODAY")}
              className={`text-xs h-7 ${timeframe === "TODAY" ? "bg-slate-900 text-white" : ""}`}
            >
              Today
            </Button>
            <Button
              variant={timeframe === "YESTERDAY" ? "default" : "ghost"}
              size="xs"
              onClick={() => setTimeframe("YESTERDAY")}
              className={`text-xs h-7 ${timeframe === "YESTERDAY" ? "bg-slate-900 text-white" : ""}`}
            >
              Yesterday
            </Button>
            <Button
              variant={timeframe === "LAST_7_DAYS" ? "default" : "ghost"}
              size="xs"
              onClick={() => setTimeframe("LAST_7_DAYS")}
              className={`text-xs h-7 ${timeframe === "LAST_7_DAYS" ? "bg-slate-900 text-white" : ""}`}
            >
              7 Days
            </Button>
            <Button
              variant={timeframe === "THIS_MONTH" ? "default" : "ghost"}
              size="xs"
              onClick={() => setTimeframe("THIS_MONTH")}
              className={`text-xs h-7 ${timeframe === "THIS_MONTH" ? "bg-slate-900 text-white" : ""}`}
            >
              This Month
            </Button>
            <Button
              variant={timeframe === "ALL_TIME" ? "default" : "ghost"}
              size="xs"
              onClick={() => setTimeframe("ALL_TIME")}
              className={`text-xs h-7 ${timeframe === "ALL_TIME" ? "bg-slate-900 text-white" : ""}`}
            >
              All Time
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportReportCSV} className="text-xs h-8">
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Accuracy Banner - Highlights Fix over Peddlr */}
      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Audit & Ledger Integrity:</strong> Idempotent calculations active.
            Backdated sales are recorded into exact historical timestamps without duplicate counting.
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0 hidden sm:inline">
          {filteredTxns.length} Verified Entries
        </span>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Gross Revenue */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 block">Gross Sales Revenue</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₱{grossSales.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>{filteredTxns.length} orders</span>
              {totalDiscount > 0 && <span>Disc: ₱{totalDiscount.toFixed(0)}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Cost of Goods Sold */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 block">Cost of Goods Sold (COGS)</span>
            <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
              ₱{cogs.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Wholesale cost of items sold</div>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 block">Gross Profit</span>
            <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
              ₱{grossProfit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              {grossMarginPercent}% Gross Margin
            </div>
          </CardContent>
        </Card>

        {/* Net Profit (The Gold Standard) */}
        <Card className={`border-2 ${netProfit >= 0 ? "bg-emerald-50/40 border-emerald-500" : "bg-red-50/40 border-red-500"}`}>
          <CardContent className="p-4">
            <span className="text-xs font-bold text-slate-700 block">
              Net Profit (After Expenses)
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              ₱{netProfit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>Expenses: ₱{totalOperatingExpenses.toFixed(0)}</span>
              <span className="font-bold">{netMarginPercent}% Net</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Payment Methods & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods Distribution */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              Sales by Payment Method
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-emerald-800">Cash Payments</span>
                  <span>₱{(paymentBreakdown.CASH || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${grossSales > 0 ? ((paymentBreakdown.CASH || 0) / grossSales) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-blue-800">GCash / Maya (E-Wallet)</span>
                  <span>₱{((paymentBreakdown.GCASH || 0) + (paymentBreakdown.MAYA || 0)).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${
                        grossSales > 0
                          ? (((paymentBreakdown.GCASH || 0) + (paymentBreakdown.MAYA || 0)) / grossSales) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-amber-800">Store Credit / Utang Ledger</span>
                  <span>₱{(paymentBreakdown.CREDIT_UTANG || 0).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{
                      width: `${
                        grossSales > 0 ? ((paymentBreakdown.CREDIT_UTANG || 0) / grossSales) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Best Selling Items */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
              Top Selling Products
            </h3>

            {topSellers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sales logged in this timeframe.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {topSellers.map((item, idx) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400 w-4 text-center">#{idx + 1}</span>
                      <span className="text-lg">{item.product.emoji}</span>
                      <div>
                        <div className="font-semibold text-slate-900">{item.product.name}</div>
                        <span className="text-[11px] text-slate-400">{item.qty} units sold</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900">₱{item.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-600" />
            Detailed Transaction History ({filteredTxns.length} Records)
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Receipt No.</th>
                <th className="p-3">Date / Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Cashier</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTxns.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-mono font-semibold text-slate-900">{t.receiptNumber}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {t.isBackdated && (
                      <Badge variant="outline" className="ml-1 text-[9px] text-purple-700 bg-purple-50">
                        Backdated
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-slate-800">
                      {t.customerName || "Walk-in Customer"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    <span className="truncate max-w-[180px] block" title={t.items.map(i => `${i.quantity}x ${i.product.name}`).join(", ")}>
                      {t.items.length} item{t.items.length > 1 ? "s" : ""} ({t.items.map((i) => i.product.name).join(", ")})
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        t.paymentMethod === "CASH"
                          ? "text-emerald-700 border-emerald-300"
                          : t.paymentMethod === "CREDIT_UTANG"
                          ? "text-amber-700 border-amber-300 bg-amber-50"
                          : "text-blue-700 border-blue-300 bg-blue-50"
                      }`}
                    >
                      {t.paymentMethod}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{t.cashierName}</td>
                  <td className="p-3 text-right font-bold text-slate-900 text-sm">
                    ₱{t.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTxns.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No transactions found in this date range.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
