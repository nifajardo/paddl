"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Product, ProductCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  Download, 
  Boxes, 
  TrendingUp, 
  RotateCw,
  PlusCircle,
  MinusCircle
} from "lucide-react";

const CATEGORIES: ProductCategory[] = [
  "Beverages",
  "Canned Goods & Instant",
  "Snacks & Sweets",
  "Rice & Grains",
  "Personal Care",
  "Household & Cleaning",
  "Cigarettes & Alcohol",
  "Services & E-Load",
];

const EMOJI_OPTIONS = ["🥫", "🍜", "🍺", "☕", "🥤", "🍚", "🥔", "🧼", "🌾", "📱", "🍪", "🧴", "🍬", "🥚", "🍞"];

export function InventoryView() {
  const { products, addProduct, updateProduct, deleteProduct, adjustProductStock } = useStore();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("Restock from wholesaler");

  // Add/Edit Form State
  const [formName, setFormName] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formCategory, setFormCategory] = useState<ProductCategory>("Snacks & Sweets");
  const [formCostPrice, setFormCostPrice] = useState<string>("");
  const [formSellingPrice, setFormSellingPrice] = useState<string>("");
  const [formStock, setFormStock] = useState<string>("");
  const [formMinStock, setFormMinStock] = useState<string>("10");
  const [formUnit, setFormUnit] = useState<string>("pcs");
  const [formEmoji, setFormEmoji] = useState<string>("🥫");

  // Calculate KPIs
  const totalSKUs = products.length;
  const totalCostValuation = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0);
  const potentialProfit = totalRetailValuation - totalCostValuation;

  const lowStockItems = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert);
  const outOfStockItems = products.filter((p) => p.stock <= 0);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
      let matchesStock = true;
      if (stockFilter === "LOW_STOCK") matchesStock = p.stock > 0 && p.stock <= p.minStockAlert;
      if (stockFilter === "OUT_OF_STOCK") matchesStock = p.stock <= 0;
      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, search, selectedCategory, stockFilter]);

  // Open modal handlers
  const handleOpenAdd = () => {
    setFormName("");
    setFormBarcode(`BAR-${Date.now().toString().slice(-6)}`);
    setFormCategory("Snacks & Sweets");
    setFormCostPrice("");
    setFormSellingPrice("");
    setFormStock("20");
    setFormMinStock("10");
    setFormUnit("pcs");
    setFormEmoji("🥫");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode);
    setFormCategory(p.category);
    setFormCostPrice(p.costPrice.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormStock(p.stock.toString());
    setFormMinStock(p.minStockAlert.toString());
    setFormUnit(p.unit);
    setFormEmoji(p.emoji);
  };

  const handleOpenAdjust = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustDelta("10");
    setAdjustReason("Wholesale Delivery Restock");
  };

  // Form Submits
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(formCostPrice) || 0;
    const price = parseFloat(formSellingPrice) || 0;
    const stock = parseInt(formStock) || 0;
    const minAlert = parseInt(formMinStock) || 10;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formName.trim(),
        barcode: formBarcode.trim(),
        category: formCategory,
        costPrice: cost,
        sellingPrice: price,
        stock,
        minStockAlert: minAlert,
        unit: formUnit.trim(),
        emoji: formEmoji,
      });
      setEditingProduct(null);
    } else {
      addProduct({
        name: formName.trim(),
        barcode: formBarcode.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        category: formCategory,
        costPrice: cost,
        sellingPrice: price,
        stock,
        minStockAlert: minAlert,
        unit: formUnit.trim() || "pcs",
        emoji: formEmoji,
        isActive: true,
      });
      setIsAddModalOpen(false);
    }
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const delta = parseInt(adjustDelta) || 0;
    adjustProductStock(adjustingProduct.id, delta, adjustReason);
    setAdjustingProduct(null);
  };

  const handleExportCSV = () => {
    const headers = "ID,Name,Barcode,Category,CostPrice,SellingPrice,Stock,Unit,Valuation\n";
    const rows = products
      .map(
        (p) =>
          `"${p.id}","${p.name}","${p.barcode}","${p.category}",${p.costPrice},${p.sellingPrice},${
            p.stock
          },"${p.unit}",${(p.costPrice * p.stock).toFixed(2)}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `peddlr_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Profit Margins in Form
  const formCost = parseFloat(formCostPrice) || 0;
  const formPrice = parseFloat(formSellingPrice) || 0;
  const marginProfit = formPrice - formCost;
  const marginPercent = formPrice > 0 ? ((marginProfit / formPrice) * 100).toFixed(1) : "0.0";
  const markupPercent = formCost > 0 ? ((marginProfit / formCost) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Inventory & Stock Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time catalog, profit margin tracking, and inventory valuation
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-9">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Item
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Catalog</span>
              <Boxes className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalSKUs} SKUs</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active products</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Stock Valuation (Cost)</span>
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
              ₱{totalCostValuation.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Retail: ₱{totalRetailValuation.toLocaleString("en-PH", { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Potential Profit</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
              ₱{potentialProfit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg Margin: {totalRetailValuation > 0 ? ((potentialProfit / totalRetailValuation) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Low / Out of Stock</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1 flex items-center gap-2">
              <span>{lowStockItems.length} Low</span>
              <span className="text-red-600 text-sm font-semibold">({outOfStockItems.length} Out)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Needs wholesaler reorder</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by product name, barcode, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="LOW_STOCK">Low Stock Only ({lowStockItems.length})</option>
              <option value="OUT_OF_STOCK">Out of Stock Only ({outOfStockItems.length})</option>
            </select>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-right">Profit / Margin</th>
                <th className="p-3 text-center">Stock Level</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const profit = p.sellingPrice - p.costPrice;
                const margin = p.sellingPrice > 0 ? ((profit / p.sellingPrice) * 100).toFixed(0) : "0";
                const isOut = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl shrink-0">{p.emoji}</span>
                        <div>
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.barcode || "No Barcode"} • {p.unit || "pc"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                        {p.category}
                      </span>
                    </td>

                    <td className="p-3 text-right font-medium text-slate-700">
                      ₱{p.costPrice.toFixed(2)}
                    </td>

                    <td className="p-3 text-right font-bold text-slate-900">
                      ₱{p.sellingPrice.toFixed(2)}
                    </td>

                    <td className="p-3 text-right">
                      <span className="font-semibold text-emerald-600">+₱{profit.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 block">({margin}%)</span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-bold text-slate-800 text-sm">{p.stock}</span>
                      <span className="text-[10px] text-slate-400 ml-1">{p.unit}</span>
                    </td>

                    <td className="p-3 text-center">
                      {isOut ? (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0">
                          Out of Stock
                        </Badge>
                      ) : isLow ? (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-amber-100 text-amber-800">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-emerald-100 text-emerald-800">
                          In Stock
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="xs"
                        className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => handleOpenAdjust(p)}
                        title="Adjust Stock Quantity"
                      >
                        <ArrowUpDown className="h-3 w-3 mr-1" /> Adjust
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-xs text-slate-600 hover:text-slate-900"
                        onClick={() => handleOpenEdit(p)}
                        title="Edit Details"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-xs text-red-500 hover:text-red-700"
                        onClick={() => deleteProduct(p.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No products found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT PRODUCT DIALOG */}
      {(isAddModalOpen || Boolean(editingProduct)) && (
        <Dialog
          open={isAddModalOpen || Boolean(editingProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingProduct(null);
          }
        }}
      >
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingProduct ? "Edit Product Details" : "Add New Item to Inventory"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
            {/* Name & Emoji */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1">
                <Label htmlFor="prod-name" className="text-xs">Product Name</Label>
                <Input
                  id="prod-name"
                  required
                  placeholder="e.g. San Miguel Pale Pilsen 330ml"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-emoji" className="text-xs">Icon</Label>
                <select
                  id="prod-emoji"
                  value={formEmoji}
                  onChange={(e) => setFormEmoji(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white text-base text-center"
                >
                  {EMOJI_OPTIONS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-cat" className="text-xs">Category</Label>
                <select
                  id="prod-cat"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-barcode" className="text-xs">Barcode / SKU</Label>
                <Input
                  id="prod-barcode"
                  placeholder="e.g. 4800016010015"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prod-cost" className="text-xs font-semibold text-slate-700">
                    Cost Price from Wholesaler (₱)
                  </Label>
                  <Input
                    id="prod-cost"
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="text-xs h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prod-price" className="text-xs font-semibold text-emerald-800">
                    Retail Selling Price (₱)
                  </Label>
                  <Input
                    id="prod-price"
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="text-xs h-9 bg-white font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Profit Margin Preview */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <span>
                  Gross Profit: <strong className="text-emerald-700">₱{marginProfit.toFixed(2)}</strong>
                </span>
                <span>
                  Margin: <strong>{marginPercent}%</strong> | Markup: <strong>{markupPercent}%</strong>
                </span>
              </div>
            </div>

            {/* Stock, Low Stock Alert, and Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-stock" className="text-xs">Initial Stock</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  required
                  min="0"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-alert" className="text-xs">Low Stock Alert</Label>
                <Input
                  id="prod-alert"
                  type="number"
                  min="1"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-unit" className="text-xs">Unit Type</Label>
                <Input
                  id="prod-unit"
                  placeholder="pcs, pack, can, bottle"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {editingProduct ? "Save Changes" : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {Boolean(adjustingProduct) && (
        <Dialog open={Boolean(adjustingProduct)} onOpenChange={(open) => !open && setAdjustingProduct(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-indigo-600" />
              Adjust Stock: {adjustingProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {adjustingProduct && (
            <form onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between">
                <span className="text-slate-600">Current In-Stock Quantity:</span>
                <span className="text-lg font-bold text-slate-900">
                  {adjustingProduct.stock} {adjustingProduct.unit}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjust-qty" className="text-xs font-semibold">
                  Adjustment Amount (+ to add, - to deduct)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAdjustDelta((prev) => (parseInt(prev) - 1).toString())}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <Input
                    id="adjust-qty"
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    className="text-center font-bold text-base h-10"
                    placeholder="0"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAdjustDelta((prev) => (parseInt(prev || "0") + 1).toString())}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="adjust-reason" className="text-xs">Reason for Adjustment</Label>
                <select
                  id="adjust-reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-md border border-slate-200 bg-white"
                >
                  <option value="Restock from wholesaler">Restock from wholesaler (Delivery)</option>
                  <option value="Damaged / Broken goods">Damaged / Broken goods (Waste)</option>
                  <option value="Expired product removal">Expired product removal</option>
                  <option value="Physical inventory count correction">Physical inventory count correction</option>
                  <option value="Owner personal consumption">Owner personal consumption</option>
                </select>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between text-xs">
                <span className="text-emerald-900">Resulting Stock Level:</span>
                <span className="font-extrabold text-emerald-700">
                  {Math.max(0, adjustingProduct.stock + (parseInt(adjustDelta) || 0))} {adjustingProduct.unit}
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdjustingProduct(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Update Stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
