"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Product, CartItem, Transaction } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ScanBarcode, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle,
  Tag
} from "lucide-react";
import { CheckoutModal } from "./CheckoutModal";
import { ReceiptModal } from "./ReceiptModal";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { sound } from "@/lib/sounds";
import { toast } from "sonner";

const CATEGORIES = [
  "All",
  "Beverages",
  "Canned Goods & Instant",
  "Snacks & Sweets",
  "Rice & Grains",
  "Personal Care",
  "Household & Cleaning",
  "Cigarettes & Alcohol",
  "Services & E-Load",
];

export function POSView() {
  const { products, customers, settings, processCheckout } = useStore();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`Out of stock: ${product.name}`);
      return;
    }

    sound.beep();
    toast.success(`Added ${product.name}`, { duration: 1200 });

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warning(`Maximum available stock reached (${product.stock} units)`);
          return prev; // cannot exceed stock
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.product.sellingPrice - item.customDiscount,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          customDiscount: 0,
          subtotal: product.sellingPrice,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    sound.click();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const product = products.find((p) => p.id === productId) || item.product;
            const newQ = item.quantity + delta;
            if (newQ > product.stock) {
              toast.warning(`Cannot exceed stock limit (${product.stock})`);
              return item;
            }
            return {
              ...item,
              quantity: newQ,
              subtotal: newQ * item.product.sellingPrice - item.customDiscount,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    sound.click();
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    sound.click();
    setCart([]);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Handle successful checkout
  const handleCheckoutComplete = (checkoutData: any) => {
    sound.chaChing();
    const txn = processCheckout(checkoutData);
    setLastTransaction(txn);
    setIsCheckoutOpen(false);
    setIsReceiptOpen(true);
    setCart([]);
    toast.success("Checkout completed successfully! Receipt generated.", { duration: 3000 });
  };

  const CartContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-emerald-600" />
          <span className="font-bold text-sm text-slate-800">Current Order</span>
          <Badge variant="secondary" className="text-xs">
            {totalItemsCount} pcs
          </Badge>
        </div>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={clearCart}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Cart List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <ShoppingCart className="h-10 w-10 mb-2 stroke-[1.5]" />
            <p className="text-xs">Cart is empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click any product to add</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col gap-1.5"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base shrink-0">{item.product.emoji}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">
                      {item.product.name}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      ₱{item.product.sellingPrice.toFixed(2)} / {item.product.unit || "pc"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 shrink-0">
                  ₱{item.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-[11px] text-red-500 hover:text-red-700 p-0 h-auto"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 rounded-md bg-white"
                    onClick={() => updateQuantity(item.product.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-bold w-5 text-center">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 rounded-md bg-white"
                    disabled={item.quantity >= item.product.stock}
                    onClick={() => updateQuantity(item.product.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="pt-3 border-t border-slate-200 mt-auto space-y-3 bg-white">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t">
            <span>Total Payable:</span>
            <span className="text-emerald-600 text-lg">₱{subtotal.toFixed(2)}</span>
          </div>
        </div>

        <Button
          size="lg"
          disabled={cart.length === 0}
          onClick={() => {
            setIsMobileCartOpen(false);
            setIsCheckoutOpen(true);
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-sm transition-all"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Charge ₱{subtotal.toFixed(2)}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-100/60">
      {/* Product Catalog Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200 overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by product name, barcode, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBarcodeOpen(true)}
              className="text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0"
            >
              <ScanBarcode className="h-4 w-4 mr-1.5" />
              Scan Barcode
            </Button>

            {/* Mobile Cart Trigger */}
            <div className="lg:hidden shrink-0">
              <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
                <SheetTrigger
                  onClick={() => setIsMobileCartOpen(true)}
                  className="relative h-9 px-3.5 inline-flex items-center justify-center rounded-md text-xs font-semibold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  Cart
                  {totalItemsCount > 0 && (
                    <span className="ml-1.5 bg-white text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                      {totalItemsCount}
                    </span>
                  )}
                </SheetTrigger>
                {isMobileCartOpen && (
                  <SheetContent side="right" className="w-full sm:max-w-md p-5 flex flex-col">
                    <SheetHeader className="pb-2">
                      <SheetTitle className="text-base font-bold">Register Order</SheetTitle>
                    </SheetHeader>
                    <CartContent />
                  </SheetContent>
                )}
              </Sheet>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-200 bg-slate-50/70 overflow-x-auto shrink-0 flex gap-1.5 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className={`cursor-pointer text-xs px-3 py-1 font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;
              const inCartQty = cart.find((i) => i.product.id === product.id)?.quantity || 0;

              return (
                <Card
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`relative select-none cursor-pointer transition-all border border-slate-200/80 bg-white hover:shadow-md hover:border-emerald-500 overflow-hidden flex flex-col justify-between ${
                    isOutOfStock ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {/* Top Bar with Emoji & Stock Status */}
                  <div className="p-3 pb-1 flex justify-between items-start">
                    <span className="text-3xl sm:text-4xl">{product.emoji}</span>
                    <div className="flex flex-col items-end gap-1">
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          Out of Stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800">
                          {product.stock} left
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-slate-100 text-slate-600">
                          {product.stock} in stock
                        </Badge>
                      )}

                      {inCartQty > 0 && (
                        <span className="bg-emerald-600 text-white font-bold text-[11px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                          {inCartQty} in cart
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <CardContent className="p-3 pt-2">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight line-clamp-2 min-h-8">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {product.category}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                        ₱{product.sellingPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        /{product.unit || "pc"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <AlertCircle className="h-10 w-10 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium">No products match your search</p>
              <p className="text-xs text-slate-400 mt-1">Try another keyword or category filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Persistent Cart Sidebar */}
      <div className="hidden lg:flex flex-col w-80 xl:w-96 bg-white p-4 border-l border-slate-200 shadow-sm shrink-0">
        <CartContent />
      </div>

      {/* Modals */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          subtotal={subtotal}
          customers={customers}
          onCompleteCheckout={handleCheckoutComplete}
        />
      )}

      {isReceiptOpen && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          transaction={lastTransaction}
          settings={settings}
        />
      )}

      {isBarcodeOpen && (
        <BarcodeScannerModal
          isOpen={isBarcodeOpen}
          onClose={() => setIsBarcodeOpen(false)}
          products={products}
          onAddProduct={(prod) => addToCart(prod)}
        />
      )}
    </div>
  );
}
