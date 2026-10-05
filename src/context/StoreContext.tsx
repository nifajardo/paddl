"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  Product, 
  Customer, 
  Expense, 
  Transaction, 
  StaffUser, 
  StoreSettings, 
  CashDrawerShift, 
  DebtEntry,
  CartItem
} from "@/types";
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_DEBT_ENTRIES,
  INITIAL_EXPENSES,
  INITIAL_TRANSACTIONS,
  INITIAL_CASH_DRAWER,
  INITIAL_STAFF,
  INITIAL_SETTINGS,
} from "@/data/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "PEDDLR_PRO_STORE_V2";

interface StoreContextType {
  // State
  products: Product[];
  customers: Customer[];
  debtEntries: DebtEntry[];
  transactions: Transaction[];
  expenses: Expense[];
  cashDrawer: CashDrawerShift;
  settings: StoreSettings;
  staffList: StaffUser[];
  currentStaff: StaffUser;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  isSupabaseActive: boolean;

  // Actions
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustProductStock: (id: string, delta: number, reason: string) => void;

  processCheckout: (data: {
    items: CartItem[];
    subtotal: number;
    discountType?: "NONE" | "SENIOR_PWD_20" | "CUSTOM";
    discountAmount: number;
    total: number;
    paymentMethod: Transaction["paymentMethod"];
    amountTendered: number;
    changeDue: number;
    customerId?: string;
    customerName?: string;
    ewalletRefNumber?: string;
    isBackdated?: boolean;
    customDate?: string;
    notes?: string;
  }) => Transaction;

  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "totalDebt">) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  recordDebtPayment: (customerId: string, amount: number, paymentMethod: "CASH" | "GCASH", notes?: string) => void;
  addManualDebt: (customerId: string, amount: number, notes: string) => void;

  addExpense: (expense: Omit<Expense, "id" | "date" | "recordedBy">) => Expense;
  openCashDrawer: (openingAmount: number, notes?: string) => void;
  closeCashDrawer: (actualCashCount: number, notes?: string) => void;
  logCashAdjustment: (amount: number, type: "IN" | "OUT", reason: string) => void;

  updateSettings: (updates: Partial<StoreSettings>) => void;
  switchStaff: (staffId: string) => void;
  syncCloud: () => Promise<void>;
  exportDataJson: () => string;
  importDataJson: (json: string) => boolean;
  resetToDemoData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>(INITIAL_DEBT_ENTRIES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [cashDrawer, setCashDrawer] = useState<CashDrawerShift>(INITIAL_CASH_DRAWER);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [staffList, setStaffList] = useState<StaffUser[]>(INITIAL_STAFF);
  const [currentStaff, setCurrentStaff] = useState<StaffUser>(INITIAL_STAFF[2]); // Maria Santos
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  // Load Initial Data (LocalStorage + Supabase Remote Sync)
  useEffect(() => {
    // 1. Initial Local Storage Load
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.debtEntries) setDebtEntries(parsed.debtEntries);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.cashDrawer) setCashDrawer(parsed.cashDrawer);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.staffList) setStaffList(parsed.staffList);
        if (parsed.currentStaff) setCurrentStaff(parsed.currentStaff);
      }
    } catch (e) {
      console.error("Failed to load store from localStorage", e);
    }
    setMounted(true);

    // 2. Online/Offline Listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 3. Supabase Cloud Sync if configured
    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      setIsSupabaseActive(true);
      const syncFromSupabase = async () => {
        try {
          const [prodRes, custRes, debtRes, txnRes, expRes] = await Promise.all([
            client.from("products").select("*"),
            client.from("customers").select("*"),
            client.from("debt_entries").select("*"),
            client.from("transactions").select("*").order("created_at", { ascending: false }),
            client.from("expenses").select("*").order("date", { ascending: false }),
          ]);

          if (prodRes.data && prodRes.data.length > 0) {
            setProducts(prodRes.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              barcode: p.barcode,
              category: p.category,
              costPrice: Number(p.cost_price),
              sellingPrice: Number(p.selling_price),
              stock: p.stock,
              minStockAlert: p.min_stock_alert,
              unit: p.unit,
              emoji: p.emoji,
              isActive: p.is_active,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            })));
          }

          if (custRes.data && custRes.data.length > 0) {
            setCustomers(custRes.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || "",
              address: c.address || "",
              creditLimit: Number(c.credit_limit),
              totalDebt: Number(c.total_debt),
              notes: c.notes || "",
              createdAt: c.created_at,
            })));
          }

          if (debtRes.data && debtRes.data.length > 0) {
            setDebtEntries(debtRes.data.map((d: any) => ({
              id: d.id,
              customerId: d.customer_id,
              customerName: d.customer_name,
              transactionId: d.transaction_id,
              type: d.type,
              amount: Number(d.amount),
              balanceAfter: Number(d.balance_after),
              notes: d.notes,
              date: d.date,
              recordedBy: d.recorded_by,
            })));
          }

          if (txnRes.data && txnRes.data.length > 0) {
            setTransactions(txnRes.data.map((t: any) => ({
              id: t.id,
              receiptNumber: t.receipt_number,
              items: t.items,
              subtotal: Number(t.subtotal),
              discountType: t.discount_type,
              discountAmount: Number(t.discount_amount),
              total: Number(t.total),
              paymentMethod: t.payment_method,
              amountTendered: Number(t.amount_tendered),
              changeDue: Number(t.change_due),
              customerId: t.customer_id,
              customerName: t.customer_name,
              cashierName: t.cashier_name,
              status: t.status,
              ewalletRefNumber: t.ewallet_ref_number,
              isBackdated: t.is_backdated,
              notes: t.notes,
              createdAt: t.created_at,
            })));
          }

          if (expRes.data && expRes.data.length > 0) {
            setExpenses(expRes.data.map((e: any) => ({
              id: e.id,
              category: e.category,
              amount: Number(e.amount),
              description: e.description,
              date: e.date,
              paymentMethod: e.payment_method,
              receiptRef: e.receipt_ref,
              recordedBy: e.recorded_by,
            })));
          }
        } catch (err) {
          console.warn("Supabase auto-fetch failed:", err);
        }
      };

      syncFromSupabase();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const stateToSave = {
        products,
        customers,
        debtEntries,
        transactions,
        expenses,
        cashDrawer,
        settings,
        staffList,
        currentStaff,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save store to localStorage", e);
    }
  }, [
    mounted,
    products,
    customers,
    debtEntries,
    transactions,
    expenses,
    cashDrawer,
    settings,
    staffList,
    currentStaff,
  ]);

  // Product Actions
  const addProduct = (prodData: Omit<Product, "id" | "createdAt" | "updatedAt">): Product => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    setPendingSyncCount((c) => c + 1);

    if (supabase && isSupabaseConfigured()) {
      supabase.from("products").insert([{
        id: newProduct.id,
        name: newProduct.name,
        barcode: newProduct.barcode,
        category: newProduct.category,
        cost_price: newProduct.costPrice,
        selling_price: newProduct.sellingPrice,
        stock: newProduct.stock,
        min_stock_alert: newProduct.minStockAlert,
        unit: newProduct.unit,
        emoji: newProduct.emoji,
        is_active: newProduct.isActive,
      }]).then(({ error }) => {
        if (error) console.error("Supabase insert product error", error);
      });
    }

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
    setPendingSyncCount((c) => c + 1);

    if (supabase && isSupabaseConfigured()) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
      if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
      if (updates.minStockAlert !== undefined) dbUpdates.min_stock_alert = updates.minStockAlert;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      supabase.from("products").update(dbUpdates).eq("id", id).then(({ error }) => {
        if (error) console.error("Supabase update product error", error);
      });
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setPendingSyncCount((c) => c + 1);

    if (supabase && isSupabaseConfigured()) {
      supabase.from("products").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("Supabase delete product error", error);
      });
    }
  };

  const adjustProductStock = (id: string, delta: number, reason: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newStock = Math.max(0, p.stock + delta);
          if (supabase && isSupabaseConfigured()) {
            supabase.from("products").update({ stock: newStock }).eq("id", id).then();
          }
          return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );
    setPendingSyncCount((c) => c + 1);
  };

  // Transaction / POS Checkout
  const processCheckout = (data: {
    items: CartItem[];
    subtotal: number;
    discountType?: "NONE" | "SENIOR_PWD_20" | "CUSTOM";
    discountAmount: number;
    total: number;
    paymentMethod: Transaction["paymentMethod"];
    amountTendered: number;
    changeDue: number;
    customerId?: string;
    customerName?: string;
    ewalletRefNumber?: string;
    isBackdated?: boolean;
    customDate?: string;
    notes?: string;
  }): Transaction => {
    const now = new Date();
    const dateStr = data.customDate || now.toISOString();

    const receiptNum = `REC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      transactions.length + 1
    ).padStart(4, "0")}`;

    const newTxn: Transaction = {
      id: `txn-${Date.now()}`,
      receiptNumber: receiptNum,
      items: data.items,
      subtotal: data.subtotal,
      discountType: data.discountType || "NONE",
      discountAmount: data.discountAmount,
      total: data.total,
      paymentMethod: data.paymentMethod,
      amountTendered: data.amountTendered,
      changeDue: data.changeDue,
      customerId: data.customerId,
      customerName: data.customerName,
      cashierName: currentStaff.name,
      status: "COMPLETED",
      ewalletRefNumber: data.ewalletRefNumber,
      isBackdated: Boolean(data.isBackdated),
      notes: data.notes,
      createdAt: dateStr,
    };

    // 1. Deduct Stock for items locally and in Supabase
    setProducts((prev) =>
      prev.map((p) => {
        const itemSold = data.items.find((item) => item.product.id === p.id);
        if (itemSold) {
          const newStock = Math.max(0, p.stock - itemSold.quantity);
          if (supabase && isSupabaseConfigured()) {
            supabase.from("products").update({ stock: newStock }).eq("id", p.id).then();
          }
          return {
            ...p,
            stock: newStock,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    // 2. If Payment is Credit / Utang, record debt
    if (data.paymentMethod === "CREDIT_UTANG" && data.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === data.customerId) {
            const updatedDebt = c.totalDebt + data.total;
            if (supabase && isSupabaseConfigured()) {
              supabase.from("customers").update({ total_debt: updatedDebt }).eq("id", c.id).then();
            }
            return { ...c, totalDebt: updatedDebt };
          }
          return c;
        })
      );

      const debtEntry: DebtEntry = {
        id: `debt-${Date.now()}`,
        customerId: data.customerId,
        customerName: data.customerName || "Customer",
        transactionId: newTxn.id,
        type: "DEBT_INCREASE",
        amount: data.total,
        balanceAfter:
          (customers.find((c) => c.id === data.customerId)?.totalDebt || 0) +
          data.total,
        notes: `Purchased ${data.items.length} items (${newTxn.receiptNumber})`,
        date: dateStr,
        recordedBy: currentStaff.name,
      };

      setDebtEntries((prev) => [debtEntry, ...prev]);

      if (supabase && isSupabaseConfigured()) {
        supabase.from("debt_entries").insert([{
          id: debtEntry.id,
          customer_id: debtEntry.customerId,
          customer_name: debtEntry.customerName,
          transaction_id: debtEntry.transactionId,
          type: debtEntry.type,
          amount: debtEntry.amount,
          balance_after: debtEntry.balanceAfter,
          notes: debtEntry.notes,
          date: debtEntry.date,
          recorded_by: debtEntry.recordedBy,
        }]).then();
      }
    }

    // 3. If Cash and NOT backdated beyond today, update active drawer
    if (data.paymentMethod === "CASH" && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashSales: prev.cashSales + data.total,
        expectedCash: prev.expectedCash + data.total,
      }));
    }

    setTransactions((prev) => [newTxn, ...prev]);
    setPendingSyncCount((c) => c + 1);

    // 4. Insert into Supabase transactions
    if (supabase && isSupabaseConfigured()) {
      supabase.from("transactions").insert([{
        id: newTxn.id,
        receipt_number: newTxn.receiptNumber,
        items: newTxn.items,
        subtotal: newTxn.subtotal,
        discount_type: newTxn.discountType,
        discount_amount: newTxn.discountAmount,
        total: newTxn.total,
        payment_method: newTxn.paymentMethod,
        amount_tendered: newTxn.amountTendered,
        change_due: newTxn.changeDue,
        customer_id: newTxn.customerId,
        customer_name: newTxn.customerName,
        cashier_name: newTxn.cashierName,
        status: newTxn.status,
        ewallet_ref_number: newTxn.ewalletRefNumber,
        is_backdated: newTxn.isBackdated,
        notes: newTxn.notes,
        created_at: newTxn.createdAt,
      }]).then(({ error }) => {
        if (error) console.error("Supabase insert transaction error", error);
      });
    }

    return newTxn;
  };

  // Customer & Debt Actions
  const addCustomer = (custData: Omit<Customer, "id" | "createdAt" | "totalDebt">): Customer => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      totalDebt: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    setPendingSyncCount((c) => c + 1);

    if (supabase && isSupabaseConfigured()) {
      supabase.from("customers").insert([{
        id: newCust.id,
        name: newCust.name,
        phone: newCust.phone,
        address: newCust.address,
        credit_limit: newCust.creditLimit,
        total_debt: newCust.totalDebt,
        notes: newCust.notes,
      }]).then();
    }

    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    setPendingSyncCount((c) => c + 1);

    if (supabase && isSupabaseConfigured()) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
      if (updates.totalDebt !== undefined) dbUpdates.total_debt = updates.totalDebt;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      supabase.from("customers").update(dbUpdates).eq("id", id).then();
    }
  };

  const recordDebtPayment = (
    customerId: string,
    amount: number,
    paymentMethod: "CASH" | "GCASH",
    notes?: string
  ) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const newBalance = Math.max(0, cust.totalDebt - amount);

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, totalDebt: newBalance } : c))
    );

    const debtEntry: DebtEntry = {
      id: `debt-${Date.now()}`,
      customerId,
      customerName: cust.name,
      type: "PAYMENT_RECEIVED",
      amount,
      balanceAfter: newBalance,
      notes: notes || `Payment received via ${paymentMethod}`,
      date: new Date().toISOString(),
      recordedBy: currentStaff.name,
    };

    setDebtEntries((prev) => [debtEntry, ...prev]);

    if (paymentMethod === "CASH" && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashIn: prev.cashIn + amount,
        expectedCash: prev.expectedCash + amount,
      }));
    }

    if (supabase && isSupabaseConfigured()) {
      supabase.from("customers").update({ total_debt: newBalance }).eq("id", customerId).then();
      supabase.from("debt_entries").insert([{
        id: debtEntry.id,
        customer_id: debtEntry.customerId,
        customer_name: debtEntry.customerName,
        type: debtEntry.type,
        amount: debtEntry.amount,
        balance_after: debtEntry.balanceAfter,
        notes: debtEntry.notes,
        date: debtEntry.date,
        recorded_by: debtEntry.recordedBy,
      }]).then();
    }

    setPendingSyncCount((c) => c + 1);
  };

  const addManualDebt = (customerId: string, amount: number, notes: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const newBalance = cust.totalDebt + amount;

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, totalDebt: newBalance } : c))
    );

    const debtEntry: DebtEntry = {
      id: `debt-${Date.now()}`,
      customerId,
      customerName: cust.name,
      type: "DEBT_INCREASE",
      amount,
      balanceAfter: newBalance,
      notes: notes || "Manual debt adjustment",
      date: new Date().toISOString(),
      recordedBy: currentStaff.name,
    };

    setDebtEntries((prev) => [debtEntry, ...prev]);

    if (supabase && isSupabaseConfigured()) {
      supabase.from("customers").update({ total_debt: newBalance }).eq("id", customerId).then();
      supabase.from("debt_entries").insert([{
        id: debtEntry.id,
        customer_id: debtEntry.customerId,
        customer_name: debtEntry.customerName,
        type: debtEntry.type,
        amount: debtEntry.amount,
        balance_after: debtEntry.balanceAfter,
        notes: debtEntry.notes,
        date: debtEntry.date,
        recorded_by: debtEntry.recordedBy,
      }]).then();
    }

    setPendingSyncCount((c) => c + 1);
  };

  // Expense Actions
  const addExpense = (
    expenseData: Omit<Expense, "id" | "date" | "recordedBy">
  ): Expense => {
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      recordedBy: currentStaff.name,
    };

    setExpenses((prev) => [newExp, ...prev]);

    if (expenseData.paymentMethod === "CASH" && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashOut: prev.cashOut + expenseData.amount,
        expectedCash: Math.max(0, prev.expectedCash - expenseData.amount),
      }));
    }

    if (supabase && isSupabaseConfigured()) {
      supabase.from("expenses").insert([{
        id: newExp.id,
        category: newExp.category,
        amount: newExp.amount,
        description: newExp.description,
        date: newExp.date,
        payment_method: newExp.paymentMethod,
        receipt_ref: newExp.receiptRef,
        recorded_by: newExp.recordedBy,
      }]).then();
    }

    setPendingSyncCount((c) => c + 1);
    return newExp;
  };

  // Cash Drawer Management
  const openCashDrawer = (openingAmount: number, notes?: string) => {
    const shift: CashDrawerShift = {
      id: `shift-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openedBy: currentStaff.name,
      openingCash: openingAmount,
      cashSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingAmount,
      status: "OPEN",
      notes,
    };
    setCashDrawer(shift);
    setPendingSyncCount((c) => c + 1);
  };

  const closeCashDrawer = (actualCashCount: number, notes?: string) => {
    const discrepancy = actualCashCount - cashDrawer.expectedCash;
    setCashDrawer((prev) => ({
      ...prev,
      closedAt: new Date().toISOString(),
      closedBy: currentStaff.name,
      actualCash: actualCashCount,
      discrepancy,
      status: "CLOSED",
      notes: notes || prev.notes,
    }));
    setPendingSyncCount((c) => c + 1);
  };

  const logCashAdjustment = (amount: number, type: "IN" | "OUT", reason: string) => {
    if (cashDrawer.status !== "OPEN") return;
    if (type === "IN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashIn: prev.cashIn + amount,
        expectedCash: prev.expectedCash + amount,
      }));
    } else {
      setCashDrawer((prev) => ({
        ...prev,
        cashOut: prev.cashOut + amount,
        expectedCash: Math.max(0, prev.expectedCash - amount),
      }));
    }
  };

  // Settings & Staff
  const updateSettings = (updates: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setPendingSyncCount((c) => c + 1);
  };

  const switchStaff = (staffId: string) => {
    const s = staffList.find((item) => item.id === staffId);
    if (s) setCurrentStaff(s);
  };

  // Sync / Backup / Reset
  const syncCloud = async () => {
    setIsSyncing(true);
    const client = supabase;
    if (client && isSupabaseConfigured()) {
      try {
        const { data: prodData } = await client.from("products").select("*");
        if (prodData && prodData.length > 0) {
          setProducts(prodData.map((p: any) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            category: p.category,
            costPrice: Number(p.cost_price),
            sellingPrice: Number(p.selling_price),
            stock: p.stock,
            minStockAlert: p.min_stock_alert,
            unit: p.unit,
            emoji: p.emoji,
            isActive: p.is_active,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          })));
        }
      } catch (e) {
        console.warn("Supabase manual sync fetch error", e);
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    setPendingSyncCount(0);
    setIsSyncing(false);
  };

  const exportDataJson = () => {
    const state = {
      products,
      customers,
      debtEntries,
      transactions,
      expenses,
      cashDrawer,
      settings,
      staffList,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(state, null, 2);
  };

  const importDataJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.products) setProducts(data.products);
      if (data.customers) setCustomers(data.customers);
      if (data.debtEntries) setDebtEntries(data.debtEntries);
      if (data.transactions) setTransactions(data.transactions);
      if (data.expenses) setExpenses(data.expenses);
      if (data.cashDrawer) setCashDrawer(data.cashDrawer);
      if (data.settings) setSettings(data.settings);
      if (data.staffList) setStaffList(data.staffList);
      return true;
    } catch {
      return false;
    }
  };

  const resetToDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setDebtEntries(INITIAL_DEBT_ENTRIES);
    setTransactions(INITIAL_TRANSACTIONS);
    setExpenses(INITIAL_EXPENSES);
    setCashDrawer(INITIAL_CASH_DRAWER);
    setSettings(INITIAL_SETTINGS);
    setStaffList(INITIAL_STAFF);
    setCurrentStaff(INITIAL_STAFF[2]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        customers,
        debtEntries,
        transactions,
        expenses,
        cashDrawer,
        settings,
        staffList,
        currentStaff,
        isOnline,
        pendingSyncCount,
        isSyncing,
        isSupabaseActive,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustProductStock,
        processCheckout,
        addCustomer,
        updateCustomer,
        recordDebtPayment,
        addManualDebt,
        addExpense,
        openCashDrawer,
        closeCashDrawer,
        logCashAdjustment,
        updateSettings,
        switchStaff,
        syncCloud,
        exportDataJson,
        importDataJson,
        resetToDemoData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
