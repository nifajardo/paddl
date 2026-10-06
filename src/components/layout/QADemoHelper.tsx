"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  ShoppingCart, 
  BookOpen, 
  Receipt, 
  RotateCcw, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  X,
  CreditCard,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sounds";

interface QADemoHelperProps {
  onNavigateTab: (tab: any) => void;
}

export function QADemoHelper({ onNavigateTab }: QADemoHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    products, 
    customers, 
    processCheckout, 
    recordDebtPayment, 
    addExpense,
    openCashDrawer,
    loadShopPreset,
    currentShopPreset
  } = useStore();

  // Scenario 1: Simulate Quick Cash Sale (2 Sari-Sari items)
  const handleSimulateQuickSale = () => {
    sound.chaChing();
    const beer = products.find(p => p.name.includes("San Miguel")) || products[0];
    const noodles = products.find(p => p.name.includes("Lucky Me")) || products[1] || products[0];

    if (!beer) {
      toast.error("No catalog items found to simulate");
      return;
    }

    const items = [
      { product: beer, quantity: 2, customDiscount: 0, subtotal: beer.sellingPrice * 2 },
      { product: noodles, quantity: 3, customDiscount: 0, subtotal: (noodles?.sellingPrice || 15) * 3 }
    ];
    const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);

    processCheckout({
      items,
      subtotal,
      discountType: "NONE",
      discountAmount: 0,
      total: subtotal,
      paymentMethod: "CASH",
      amountTendered: Math.ceil(subtotal / 100) * 100,
      changeDue: (Math.ceil(subtotal / 100) * 100) - subtotal,
      notes: "Demo Walkthrough: Quick Cash Sale"
    });

    toast.success(`Demo: Cash checkout for ₱${subtotal.toFixed(2)} completed! Check Reports or Cash Drawer.`, {
      duration: 3500
    });
  };

  // Scenario 2: Simulate GCash E-Wallet Sale with Senior Citizen Discount
  const handleSimulateGCashSeniorSale = () => {
    sound.chaChing();
    const rice = products.find(p => p.name.includes("Rice")) || products[0];
    const soap = products.find(p => p.name.includes("Safeguard")) || products[1] || products[0];

    const items = [
      { product: rice, quantity: 5, customDiscount: 0, subtotal: rice.sellingPrice * 5 },
      { product: soap, quantity: 2, customDiscount: 0, subtotal: (soap?.sellingPrice || 45) * 2 }
    ];
    const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
    const discountAmount = +(subtotal * 0.20).toFixed(2);
    const total = +(subtotal - discountAmount).toFixed(2);

    processCheckout({
      items,
      subtotal,
      discountType: "SENIOR_PWD_20",
      discountAmount,
      total,
      paymentMethod: "GCASH",
      amountTendered: total,
      changeDue: 0,
      ewalletRefNumber: `GCASH-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: "Demo Walkthrough: Senior Discount (20%) via GCash"
    });

    toast.success(`Demo: Senior Citizen 20% discount (Saved ₱${discountAmount}) via GCash!`, {
      duration: 3500
    });
  };

  // Scenario 3: Simulate Utang / Credit Transaction
  const handleSimulateCreditUtang = () => {
    sound.beep();
    const mangBoy = customers.find(c => c.name.includes("Mang Boy")) || customers[0];
    const canned = products.find(p => p.name.includes("Corned Beef") || p.name.includes("Sardines")) || products[0];

    if (!mangBoy || !canned) {
      toast.error("Need customer & product to simulate credit");
      return;
    }

    const items = [
      { product: canned, quantity: 2, customDiscount: 0, subtotal: canned.sellingPrice * 2 }
    ];
    const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);

    processCheckout({
      items,
      subtotal,
      discountType: "NONE",
      discountAmount: 0,
      total: subtotal,
      paymentMethod: "CREDIT_UTANG",
      amountTendered: 0,
      changeDue: 0,
      customerId: mangBoy.id,
      customerName: mangBoy.name,
      notes: "Demo Walkthrough: Utang on Account"
    });

    toast.success(`Demo: ₱${subtotal.toFixed(2)} charged to ${mangBoy.name}'s Utang Book!`, {
      duration: 3500
    });
    onNavigateTab("credit");
  };

  // Scenario 4: Simulate Utility Expense (e.g. Meralco Store Electric Bill)
  const handleSimulateExpense = () => {
    sound.click();
    addExpense({
      category: "Utilities & Power",
      amount: 450,
      paymentMethod: "CASH",
      description: "Demo: Store Fan & Ice Chest Electricity Share",
      receiptRef: "MERALCO-DEMO"
    });

    toast.success("Demo: ₱450.00 store utility expense recorded. Reflected in P&L Net Profit!", {
      duration: 3500
    });
    onNavigateTab("expenses");
  };

  return (
    <div className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-40">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center gap-2 border border-emerald-400/40 animate-pulse hover:animate-none"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span className="text-xs tracking-wide">Client Demo Playbook</span>
        </Button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-xl shadow-2xl p-4 w-80 sm:w-96 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold tracking-wide">QA / Client Demo Scenarios</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5 p-2 rounded-xl bg-slate-900 border border-slate-750">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Switch Business Test Template:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  loadShopPreset("SARI_SARI");
                  sound.chaChing();
                  toast.success("Loaded Sari-Sari Store dataset");
                }}
                className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold border flex items-center gap-1.5 transition ${
                  currentShopPreset === "SARI_SARI"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                <span>🏪</span>
                <span className="truncate">Sari-Sari Store</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loadShopPreset("MOTOR_SHOP");
                  sound.chaChing();
                  toast.success("Loaded Motor Parts Shop dataset");
                }}
                className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold border flex items-center gap-1.5 transition ${
                  currentShopPreset === "MOTOR_SHOP"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                <span>🏍️</span>
                <span className="truncate">Motor Parts Shop</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loadShopPreset("PHARMACY");
                  sound.chaChing();
                  toast.success("Loaded Pharmacy / Botika dataset");
                }}
                className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold border flex items-center gap-1.5 transition ${
                  currentShopPreset === "PHARMACY"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                <span>💊</span>
                <span className="truncate">Pharmacy / Botika</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loadShopPreset("MILK_TEA");
                  sound.chaChing();
                  toast.success("Loaded Milk Tea & Cafe dataset");
                }}
                className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold border flex items-center gap-1.5 transition ${
                  currentShopPreset === "MILK_TEA"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                <span>🧋</span>
                <span className="truncate">Milk Tea &amp; Cafe</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-300">
            Click any scenario to instantly demonstrate core features solving Peddlr&apos;s pain points live to your client:
          </p>

          <div className="space-y-1.5 text-xs">
            {/* Scenario 1 */}
            <button
              onClick={handleSimulateQuickSale}
              className="w-full text-left p-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 hover:border-emerald-500/50 border border-slate-700 flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-emerald-300">
                    1. Instant Cash Checkout
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Simulates fast retail sale &amp; drawer update
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
                Run
              </Badge>
            </button>

            {/* Scenario 2 */}
            <button
              onClick={handleSimulateGCashSeniorSale}
              className="w-full text-left p-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 hover:border-blue-500/50 border border-slate-700 flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-blue-300">
                    2. GCash + 20% Senior Discount
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Auto-applies RA 9994 compliance discount
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30">
                Run
              </Badge>
            </button>

            {/* Scenario 3 */}
            <button
              onClick={handleSimulateCreditUtang}
              className="w-full text-left p-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 hover:border-amber-500/50 border border-slate-700 flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-amber-300">
                    3. Utang Book / Customer Credit
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Charges to customer balance with credit limit guard
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">
                Run
              </Badge>
            </button>

            {/* Scenario 4 */}
            <button
              onClick={handleSimulateExpense}
              className="w-full text-left p-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 hover:border-rose-500/50 border border-slate-700 flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-rose-300">
                    4. Log Store Operating Expense
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Deducts from net profit &amp; cash drawer
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] text-rose-400 border-rose-500/30">
                Run
              </Badge>
            </button>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800">
            <span>Connected to Supabase PostgreSQL</span>
            <button 
              onClick={() => onNavigateTab("reports")}
              className="text-emerald-400 hover:underline font-semibold"
            >
              View Financial P&amp;L &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
