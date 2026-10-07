"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { businessDate, retainedCost, retainedLine, netSale, csvCell, downloadFile } from "@/lib/commerce";
import { reportRange, inReportRange } from "@/lib/reports";
import { Transaction, Product } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Download,
  Printer,
  Search,
  Ban,
  Undo2,
  Filter,
  Clock,
  Layers,
  Eye,
  History,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { ZReadingModal } from "./ZReadingModal";
import { VoidTransactionModal } from "@/components/pos/VoidTransactionModal";
import { ReturnRefundModal } from "@/components/pos/ReturnRefundModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";

type TimeframePreset = 
  | "TODAY" 
  | "YESTERDAY" 
  | "THIS_WEEK" 
  | "LAST_WEEK" 
  | "THIS_MONTH" 
  | "LAST_MONTH" 
  | "THIS_YEAR" 
  | "CUSTOM" 
  | "ALL_TIME";

export function ReportsView() {
  const { 
    transactions, 
    expenses, 
    products, 
    settings, 
    cashDrawer, 
    currentStaff, 
    auditLogs, 
    returnRecords 
  } = useStore();

  const [activeTab, setActiveTab] = useState<"FINANCIAL" | "PRODUCT_SEARCH" | "TRANSACTIONS" | "AUDIT">("FINANCIAL");
  const [timeframe, setTimeframe] = useState<TimeframePreset>("ALL_TIME");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [exactDateSearch, setExactDateSearch] = useState<string>("");

  // Product Drill-down state
  const [productSearch, setProductSearch] = useState<string>("");
  const [selectedDrillDownProduct, setSelectedDrillDownProduct] = useState<Product | null>(null);

  // Transaction History Filter state
  const [txSearch, setTxSearch] = useState<string>("");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("ALL");
  const [txPaymentFilter, setTxPaymentFilter] = useState<string>("ALL");

  // Modals state
  const [isZReadingOpen, setIsZReadingOpen] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [selectedTxForVoid, setSelectedTxForVoid] = useState<Transaction | null>(null);
  const [selectedTxForReturn, setSelectedTxForReturn] = useState<Transaction | null>(null);

  const period = reportRange(timeframe, customStartDate, customEndDate, exactDateSearch);
  const invalidRange = Boolean(period.start && period.end && period.start > period.end);
  const filteredTxns = transactions.filter(t => !invalidRange && inReportRange(t.createdAt, period));
  const filteredExpenses = expenses.filter(e => !invalidRange && inReportRange(e.date, period));
  const filteredAuditLogs = auditLogs.filter(log => !invalidRange && inReportRange(log.timestamp || log.createdAt, period));

  // Non-voided valid sales for financial analytics
  const validFinancialTxns = useMemo(() => {
    return filteredTxns.filter((t) => t.status !== "VOID" && t.status !== "VOIDED");
  }, [filteredTxns]);

  // Core Financial Metrics
  const grossSales = useMemo(() => {
    return validFinancialTxns.reduce((sum, t) => sum + t.total, 0);
  }, [validFinancialTxns]);

  const totalDiscount = useMemo(() => {
    return validFinancialTxns.reduce((sum, t) => sum + t.discountAmount, 0);
  }, [validFinancialTxns]);

  // Sales-period reporting includes all returns recorded against these sales.
  const totalRefunds = validFinancialTxns.reduce((sum, t) => sum + (t.refundedAmount || 0), 0);
  const netSales = validFinancialTxns.reduce((sum, t) => sum + netSale(t), 0);

  // Cost of Goods Sold (COGS)
  const cogs = useMemo(() => validFinancialTxns.reduce((sum, txn) => sum + retainedCost(txn), 0), [validFinancialTxns]);

  const grossProfit = netSales - cogs;
  const grossMarginPercent = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : "0.0";

  const totalOperatingExpenses = useMemo(() => {
    return filteredExpenses.filter(e => e.category !== "Supplier & Stock Restock" && e.category !== "Personal Drawings").reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : "0.0";

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { CASH: 0, GCASH: 0, MAYA: 0, SPLIT: 0, CREDIT_UTANG: 0 };
    validFinancialTxns.forEach((t) => {
      if (t.paymentMethod === "SPLIT" && t.splitDetail) {
        const ratio = t.total ? netSale(t) / t.total : 0;
        map.CASH += t.splitDetail.cashAmount * ratio;
        map[t.splitDetail.digitalMethod] = (map[t.splitDetail.digitalMethod] || 0) + t.splitDetail.digitalAmount * ratio;
      } else map[t.paymentMethod] = (map[t.paymentMethod] || 0) + netSale(t);
    });
    return map;
  }, [validFinancialTxns]);

  // Top Selling Items
  const topSellers = useMemo(() => {
    const itemMap: Record<string, { product: Product; qty: number; revenue: number }> = {};
    validFinancialTxns.forEach((t) => {
      t.items.forEach((item) => {
        if (!itemMap[item.product.id]) {
          itemMap[item.product.id] = { product: item.product, qty: 0, revenue: 0 };
        }
        const retained = retainedLine(t, item.product.id);
        itemMap[item.product.id].qty += retained.quantity;
        itemMap[item.product.id].revenue += retained.revenue;
      });
    });

    return Object.values(itemMap)
      .filter(item => item.qty > 0 || item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [validFinancialTxns]);

  // Product Drill-Down Analytics
  const productDrillDownData = useMemo(() => {
    if (!selectedDrillDownProduct && !productSearch.trim()) return null;

    const query = productSearch.trim().toLowerCase();
    const targetProduct = selectedDrillDownProduct || products.find(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        (p.genericName && p.genericName.toLowerCase().includes(query))
    );

    if (!targetProduct) return null;

    // Gather all transaction lines containing this product
    const lines: {
      transaction: Transaction;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    let totalQty = 0;
    let totalRevenue = 0;

    validFinancialTxns.forEach((t) => {
      if (t.status === "VOID" || t.status === "VOIDED") return;
      t.items.forEach((item) => {
        if (item.product.id === targetProduct.id) {
          const retained = retainedLine(t, item.product.id);
          totalQty += retained.quantity;
          totalRevenue += retained.revenue;
          lines.push({
            transaction: t,
            quantity: retained.quantity,
            unitPrice: item.product.sellingPrice,
            subtotal: retained.revenue,
          });
        }
      });
    });

    const avgPrice = totalQty > 0 ? totalRevenue / totalQty : 0;

    return {
      product: targetProduct,
      totalQty,
      totalRevenue,
      transactionCount: lines.length,
      averageSellingPrice: avgPrice,
      lines: lines.sort((a, b) => new Date(b.transaction.createdAt).getTime() - new Date(a.transaction.createdAt).getTime()),
    };
  }, [productSearch, selectedDrillDownProduct, products, validFinancialTxns]);

  // Filtered Transaction History Ledger
  const ledgerTransactions = useMemo(() => {
    return filteredTxns.filter((t) => {
      const q = txSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.receiptNumber.toLowerCase().includes(q) ||
        t.cashierName.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        t.items.some((i) => i.product.name.toLowerCase().includes(q));

      const matchesStatus =
        txStatusFilter === "ALL" ||
        t.status === txStatusFilter ||
        (txStatusFilter === "VOIDED" && (t.status === "VOIDED" || t.status === "VOID"));

      const matchesPayment = txPaymentFilter === "ALL" || t.paymentMethod === txPaymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [filteredTxns, txSearch, txStatusFilter, txPaymentFilter]);

  const handleExportReportCSV = () => {
    const rows = [["Receipt", "Date", "Customer", "Cashier", "Payment", "Subtotal", "Discount", "Total", "Refunds", "Net", "Status"], ...filteredTxns.map(t => [t.receiptNumber, t.createdAt, t.customerName || "Walk-in", t.cashierName, t.paymentMethod, t.subtotal, t.discountAmount, t.total, t.refundedAmount || 0, netSale(t), t.status])];
    downloadFile("paddl-report-" + businessDate() + ".csv", "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Financial Reports & Business Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Management estimates for sales in the selected period, including their recorded returns.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            disabled={invalidRange}
            onClick={() => setIsZReadingOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold gap-1.5 shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            Print sales summary
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReportCSV}
            className="text-xs h-9 bg-white border-slate-200"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-600" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold text-slate-600 pb-px">
        <button
          onClick={() => setActiveTab("FINANCIAL")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "FINANCIAL"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Financial P&L Summary
        </button>

        <button
          onClick={() => setActiveTab("PRODUCT_SEARCH")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "PRODUCT_SEARCH"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <Search className="h-4 w-4" />
          Product Sales Drill-down
        </button>

        <button
          onClick={() => setActiveTab("TRANSACTIONS")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "TRANSACTIONS"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Transaction History ({filteredTxns.length})
        </button>

        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "AUDIT"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent hover:text-slate-900"
          }`}
        >
          <History className="h-4 w-4" />
          System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Universal Date Range Filter Bar */}
      <div className="min-w-0 bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="min-w-0 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Preset:
            </span>
            {[
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "THIS_WEEK", label: "This Week" },
              { id: "LAST_WEEK", label: "Last Week" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
              { id: "ALL_TIME", label: "All Time" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setTimeframe(p.id as any);
                  setExactDateSearch("");
                }}
                className={`px-2.5 py-1.5 rounded-md font-semibold whitespace-nowrap transition ${
                  timeframe === p.id && !exactDateSearch
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Exact Date Search */}
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="exact-date" className="text-xs text-slate-500 shrink-0 font-medium">
              Exact Day:
            </Label>
            <Input
              id="exact-date"
              type="date"
              value={exactDateSearch}
              onChange={(e) => {
                setExactDateSearch(e.target.value);
                if (e.target.value) setTimeframe("CUSTOM");
              }}
              className="h-8 text-xs bg-slate-50 w-36"
            />
            {exactDateSearch && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setExactDateSearch("")}
                className="text-[11px] text-rose-600"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Custom Range Date Pickers */}
        {timeframe === "CUSTOM" && !exactDateSearch && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Start:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs bg-slate-50 w-36"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">End:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs bg-slate-50 w-36"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              {invalidRange ? "Start date must be on or before end date." : "Dates are inclusive, in Philippine time."}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">Reporting period: {period.label} · Philippine time. Returns are attributed to the original sale. Debt collections are not new sales.</p>

      {/* TAB 1: FINANCIAL P&L SUMMARY */}
      {activeTab === "FINANCIAL" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Sales after discounts</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  ₱{grossSales.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {validFinancialTxns.length} valid transaction(s)
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Cost of Goods (COGS)</span>
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">
                  ₱{cogs.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Wholesale inventory cost</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Gross Profit</span>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
                  ₱{grossProfit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Gross Margin: {grossMarginPercent}%</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Net Clean Profit</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
                  ₱{netProfit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  After ₱{totalOperatingExpenses.toFixed(2)} expenses ({netMarginPercent}%)
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Refund Impact Note if any */}
          {totalRefunds > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <span>
                  <strong>Refunds & Returns Recorded:</strong> ₱{totalRefunds.toFixed(2)} refunded across returned orders.
                </span>
              </div>
              <span className="font-bold text-amber-800">Net Sales: ₱{netSales.toFixed(2)}</span>
            </div>
          )}

          {/* Payment Method Breakdown & Top Sellers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tender Breakdown */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Payment Channels & Tender Split
                </h3>

                <div className="space-y-3 text-xs">
                  {Object.entries(paymentBreakdown).filter(([method]) => method !== "SPLIT").map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-700">{({ CASH: "Cash sales", GCASH: "GCash", MAYA: "Maya", CREDIT_UTANG: "Credit / Utang", BANK_TRANSFER: "Bank transfer", CARD: "Card" } as Record<string, string>)[method] || method}</span>
                      <span className="font-bold text-slate-900 font-mono">₱{amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500">Split payments are allocated to cash and their digital channel. These are net sales, not the current drawer balance.</p>
                </div>
              </CardContent>
            </Card>

            {/* Top Selling Products */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-600" />
                  Top Revenue Drivers
                </h3>

                {topSellers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No sales logged in this timeframe.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topSellers.map((item, idx) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition"
                        onClick={() => {
                          setSelectedDrillDownProduct(item.product);
                          setActiveTab("PRODUCT_SEARCH");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-4 text-center">#{idx + 1}</span>
                          <span className="text-base">{item.product.emoji}</span>
                          <div>
                            <div className="font-semibold text-slate-900">{item.product.name}</div>
                            <span className="text-[11px] text-slate-400">{item.qty} sold • Click to drill down</span>
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
        </div>
      )}

      {/* TAB 2: PRODUCT SALES DRILL-DOWN */}
      {activeTab === "PRODUCT_SEARCH" && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Search className="h-4 w-4 text-emerald-600" />
                    Product Performance & Sales History Search
                  </h3>
                  <p className="text-xs text-slate-500">
                    Answer questions like "How many Coca-Cola did we sell?" with instant quantity, revenue, and average price.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search product name or SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setSelectedDrillDownProduct(null);
                    }}
                    className="pl-9 text-xs bg-slate-50 h-9"
                  />
                </div>
              </div>

              {/* Quick Select Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Select:</span>
                {products.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedDrillDownProduct(p);
                      setProductSearch(p.name);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-md transition border ${
                      productDrillDownData?.product.id === p.id
                        ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>

              {/* Product Drill-Down Metrics Card */}
              {productDrillDownData ? (
                <div className="mt-4 p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 bg-white rounded-xl border border-emerald-100">
                        {productDrillDownData.product.emoji}
                      </span>
                      <div>
                        <div className="font-bold text-base text-slate-900 flex items-center gap-2">
                          <span>{productDrillDownData.product.name}</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-800 bg-white">
                            {productDrillDownData.product.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          SKU / Barcode: {productDrillDownData.product.barcode || "None"} • Cost: ₱{productDrillDownData.product.costPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Current Retail Price:</span>
                      <span className="text-lg font-black text-emerald-700">
                        ₱{productDrillDownData.product.sellingPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 4 Performance Tiles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">Units retained after returns</span>
                      <span className="text-xl font-black text-slate-900">
                        {productDrillDownData.totalQty} {productDrillDownData.product.unit || "pcs"}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">Net revenue after discounts & returns</span>
                      <span className="text-xl font-black text-emerald-700">
                        ₱{productDrillDownData.totalRevenue.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">Number of Transactions</span>
                      <span className="text-xl font-black text-slate-900">
                        {productDrillDownData.transactionCount}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">Average Selling Price</span>
                      <span className="text-xl font-black text-blue-700">
                        ₱{productDrillDownData.averageSellingPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Individual Sales Table */}
                  <div className="pt-2">
                    <h4 className="font-semibold text-xs text-slate-800 mb-2">
                      Transaction Breakdown for {productDrillDownData.product.name}:
                    </h4>

                    <div className="overflow-x-auto border border-emerald-200 rounded-lg bg-white">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Date / Time</th>
                            <th className="p-2.5">Receipt #</th>
                            <th className="p-2.5">Customer</th>
                            <th className="p-2.5">Cashier</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Unit Price</th>
                            <th className="p-2.5 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {productDrillDownData.lines.map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-slate-500">
                                {new Date(line.transaction.createdAt).toLocaleString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="p-2.5 font-mono font-semibold text-slate-900">
                                {line.transaction.receiptNumber}
                              </td>
                              <td className="p-2.5">{line.transaction.customerName || "Walk-in"}</td>
                              <td className="p-2.5 text-slate-500">{line.transaction.cashierName}</td>
                              <td className="p-2.5 text-center font-bold text-slate-800">{line.quantity}</td>
                              <td className="p-2.5 text-right">₱{line.unitPrice.toFixed(2)}</td>
                              <td className="p-2.5 text-right font-bold text-slate-900">
                                ₱{line.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Select a product above or search by name to view sales history.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: TRANSACTION HISTORY & ACTIONS */}
      {activeTab === "TRANSACTIONS" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by receipt #, customer, cashier, or items..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PARTIALLY_RETURNED">Partially Returned</option>
                <option value="REFUNDED">Refunded</option>
                <option value="VOIDED">Voided</option>
              </select>

              <select
                value={txPaymentFilter}
                onChange={(e) => setTxPaymentFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Payments</option>
                <option value="CASH">Cash</option>
                <option value="GCASH">GCash</option>
                <option value="MAYA">Maya</option>
                <option value="SPLIT">Split Bill</option>
                <option value="CREDIT_UTANG">Utang / Credit</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Receipt No.</th>
                  <th className="p-3">Date / Time</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items Sold</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerTransactions.map((t) => {
                  const isVoided = t.status === "VOID" || t.status === "VOIDED";
                  const isReturned = t.status === "REFUNDED" || t.status === "PARTIALLY_RETURNED";

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isVoided ? "bg-rose-50/40 text-slate-400 line-through" : ""
                      }`}
                    >
                      <td className="p-3 font-mono font-semibold text-slate-900">
                        {t.receiptNumber}
                      </td>

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
                        <span
                          className="truncate max-w-[180px] block"
                          title={t.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}
                        >
                          {t.items.length} item{t.items.length > 1 ? "s" : ""} (
                          {t.items.map((i) => i.product.name).join(", ")})
                        </span>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            t.paymentMethod === "CASH"
                              ? "text-emerald-700 border-emerald-300"
                              : t.paymentMethod === "SPLIT"
                              ? "text-purple-700 border-purple-300 bg-purple-50"
                              : t.paymentMethod === "CREDIT_UTANG"
                              ? "text-amber-700 border-amber-300 bg-amber-50"
                              : "text-blue-700 border-blue-300 bg-blue-50"
                          }`}
                        >
                          {t.paymentMethod}
                        </Badge>
                      </td>

                      <td className="p-3">
                        {isVoided ? (
                          <Badge variant="destructive" className="text-[10px] px-2 py-0 bg-rose-600">
                            VOIDED
                          </Badge>
                        ) : t.status === "REFUNDED" ? (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-purple-100 text-purple-900 border border-purple-300">
                            REFUNDED
                          </Badge>
                        ) : t.status === "PARTIALLY_RETURNED" ? (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-amber-100 text-amber-900 border border-amber-300">
                            PARTIAL RETURN
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-emerald-100 text-emerald-800">
                            COMPLETED
                          </Badge>
                        )}
                      </td>

                      <td className="p-3 text-right font-bold text-slate-900 text-sm">
                        ₱{t.total.toFixed(2)}
                      </td>

                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {/* 1. Reprint Copy */}
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-xs text-slate-700 hover:bg-slate-100"
                          onClick={() => setSelectedTxForReceipt(t)}
                          title="Print Duplicate Receipt Copy"
                        >
                          <Printer className="h-3 w-3 mr-1" /> Copy
                        </Button>

                        {/* 2. Return / Refund */}
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                          onClick={() => setSelectedTxForReturn(t)}
                          disabled={isVoided || t.status === "REFUNDED"}
                          title="Process Return / Refund"
                        >
                          <Undo2 className="h-3 w-3 mr-1" /> Return
                        </Button>

                        {/* 3. Void Sale */}
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                          onClick={() => setSelectedTxForVoid(t)}
                          disabled={isVoided || isReturned}
                          title="Void Entire Sale"
                        >
                          <Ban className="h-3 w-3 mr-1" /> Void
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {ledgerTransactions.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No transactions found matching your criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM AUDIT TRAIL */}
      {activeTab === "AUDIT" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Activity Audit Log ({filteredAuditLogs.length} Events)
            </h3>
            <span className="text-[11px] text-slate-400">
              Tracks Voids, Returns, Cash Drawer openings, Stock changes, and Staff access
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Staff / Role</th>
                  <th className="p-3">Target Details</th>
                  <th className="p-3">Reason & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp || log.createdAt).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          log.action === "TRANSACTION_VOIDED"
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : log.action === "RETURN_PROCESSED"
                            ? "bg-amber-50 text-amber-700 border-amber-300"
                            : log.action === "SALE_CREATED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-blue-50 text-blue-700 border-blue-300"
                        }`}
                      >
                        {log.action}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{log.staffName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">[{log.staffRole}]</span>
                    </td>

                    <td className="p-3 font-mono text-slate-700">
                      {log.targetReceiptNumber && (
                        <span className="font-bold text-slate-900">Receipt #{log.targetReceiptNumber}</span>
                      )}
                      {log.targetAmount !== undefined && (
                        <span className="text-emerald-700 font-semibold block">
                          ₱{log.targetAmount.toFixed(2)}
                        </span>
                      )}
                      {log.details && (
                        <span className="text-[11px] text-slate-500 font-sans block truncate max-w-xs">
                          {log.details}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-slate-600">
                      {log.reason ? (
                        <div>
                          <span className="font-medium text-slate-900">{log.reason}</span>
                          {log.notes && (
                            <span className="text-[11px] text-slate-400 block italic">"{log.notes}"</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None provided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAuditLogs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No audit events recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAILY Z-READING AUDIT SLIP MODAL */}
      {isZReadingOpen && (
        <ZReadingModal
          isOpen={isZReadingOpen}
          onClose={() => setIsZReadingOpen(false)}
          settings={settings}
          periodLabel={period.label}
          cashDrawer={cashDrawer}
          cashierName={currentStaff.name}
          transactions={validFinancialTxns}
          expenses={filteredExpenses}
          grossSales={grossSales}
          totalDiscount={totalDiscount}
          cogs={cogs}
          grossProfit={grossProfit}
          operatingExpenses={totalOperatingExpenses}
          netProfit={netProfit}
          paymentBreakdown={paymentBreakdown}
        />
      )}

      {/* REPRINT RECEIPT COPY MODAL */}
      {Boolean(selectedTxForReceipt) && (
        <ReceiptModal
          isOpen={Boolean(selectedTxForReceipt)}
          onClose={() => setSelectedTxForReceipt(null)}
          transaction={selectedTxForReceipt}
          settings={settings}
          isCopy={true}
        />
      )}

      {/* VOID TRANSACTION MODAL */}
      {Boolean(selectedTxForVoid) && (
        <VoidTransactionModal
          isOpen={Boolean(selectedTxForVoid)}
          onClose={() => setSelectedTxForVoid(null)}
          transaction={selectedTxForVoid}
        />
      )}

      {/* RETURN / REFUND MODAL */}
      {Boolean(selectedTxForReturn) && (
        <ReturnRefundModal
          isOpen={Boolean(selectedTxForReturn)}
          onClose={() => setSelectedTxForReturn(null)}
          transaction={selectedTxForReturn}
        />
      )}
    </div>
  );
}
