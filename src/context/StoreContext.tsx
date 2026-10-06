"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  Product, 
  Customer, 
  Expense, 
  Transaction, 
  StaffUser, 
  UserRole,
  StoreSettings, 
  CashDrawerShift, 
  DebtEntry,
  CartItem,
  AuditLogEntry,
  ReturnRecord,
  ReturnItem,
  TransactionStatus,
  StaffPermissions,
  SplitPaymentDetail
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
  INITIAL_AUDIT_LOGS,
  INITIAL_RETURNS,
} from "@/data/mockData";
import { ALL_SHOP_PRESETS, ShopPreset } from "@/data/shopPresets";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "PEDDLR_PRO_STORE_V3";

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
  syncStatus: "synced" | "syncing" | "offline";
  auditLogs: AuditLogEntry[];
  returnRecords: ReturnRecord[];
  sessionUser: any | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  currentShopPreset: "SARI_SARI" | "MOTOR_SHOP" | "PHARMACY" | "MILK_TEA";

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
    splitDetail?: SplitPaymentDetail;
    isBackdated?: boolean;
    customDate?: string;
    notes?: string;
  }) => Transaction;

  voidTransaction: (params: {
    transactionId: string;
    reason: string;
    notes?: string;
  }) => { success: boolean; error?: string };

  processReturn: (params: {
    transactionId: string;
    returnedItems: { productId: string; quantity: number }[];
    reason: string;
    notes?: string;
  }) => { success: boolean; error?: string; returnRecord?: ReturnRecord };

  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "totalDebt">) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  recordDebtPayment: (customerId: string, amount: number, paymentMethod: "CASH" | "GCASH", notes?: string) => void;
  addManualDebt: (customerId: string, amount: number, notes: string) => void;

  addExpense: (expense: Omit<Expense, "id" | "date" | "recordedBy">) => Expense;
  openCashDrawer: (openingAmount: number, notes?: string) => void;
  closeCashDrawer: (actualCashCount: number, notes?: string) => void;
  logCashAdjustment: (amount: number, type: "IN" | "OUT", reason: string) => void;

  logAuditEvent: (entry: Omit<AuditLogEntry, "id" | "createdAt">) => void;
  
  // Staff & Permissions
  addStaff: (staffData: Omit<StaffUser, "id" | "createdAt">) => StaffUser;
  updateStaff: (id: string, updates: Partial<StaffUser>) => void;
  deleteStaff: (id: string) => void;
  toggleStaffActive: (id: string) => void;
  switchStaff: (staffId: string) => void;
  hasPermission: (permission: keyof StaffPermissions) => boolean;
  verifyOwnerPin: (pin: string) => boolean;

  // Settings & Theme
  updateSettings: (updates: Partial<StoreSettings>) => void;
  setFontSizeMode: (mode: "NORMAL" | "LARGE") => void;
  toggleProductBestseller: (productId: string) => void;

  // Auth & Session
  loginWithPin: (staffId: string, pin: string) => { success: boolean; error?: string };
  loginWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  registerStoreAccount: (email: string, pass: string, storeName?: string) => Promise<{ error?: string; success?: boolean }>;
  logout: () => Promise<void>;
  quickDemoLogin: (role: UserRole) => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;

  // Shop Presets
  loadShopPreset: (presetKey: "SARI_SARI" | "MOTOR_SHOP" | "PHARMACY" | "MILK_TEA") => void;

  // Sync & Backup
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
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>(INITIAL_RETURNS);
  
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentShopPreset, setCurrentShopPreset] = useState<"SARI_SARI" | "MOTOR_SHOP" | "PHARMACY" | "MILK_TEA">("SARI_SARI");

  // Derived sync status
  const syncStatus: "synced" | "syncing" | "offline" = !isOnline
    ? "offline"
    : isSyncing
    ? "syncing"
    : "synced";

  // Load Initial Data (LocalStorage + Supabase Remote Sync)
  useEffect(() => {
    // 1. Initial Local Storage Load
    try {
      // Check auth session
      const authSession = localStorage.getItem("PADDLR_AUTH_SESSION");
      if (authSession) {
        try {
          const parsedAuth = JSON.parse(authSession);
          if (parsedAuth && parsedAuth.authenticated) {
            setIsAuthenticated(true);
          }
        } catch {}
      }

      const savedPreset = localStorage.getItem("PADDLR_CURRENT_PRESET");
      if (savedPreset && (savedPreset === "SARI_SARI" || savedPreset === "MOTOR_SHOP" || savedPreset === "PHARMACY" || savedPreset === "MILK_TEA")) {
        setCurrentShopPreset(savedPreset as any);
      }

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
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.returnRecords) setReturnRecords(parsed.returnRecords);
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

    // 3. Supabase Auth & Realtime Sync if configured
    let realtimeChannel: any = null;
    let authSub: any = null;

    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      setIsSupabaseActive(true);

      // Auth Session check
      client.auth.getSession().then(({ data: { session } }) => {
        setSessionUser(session?.user || null);
      });

      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        setSessionUser(session?.user || null);
      });
      authSub = authListener;

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

      // Multi-device realtime listener
      realtimeChannel = client
        .channel("peddlr-realtime-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => syncFromSupabase()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transactions" },
          () => syncFromSupabase()
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
      if (authSub?.subscription) {
        authSub.subscription.unsubscribe();
      }
    };
  }, []);

  // Audit Logger
  const logAuditEvent = useCallback((entry: Omit<AuditLogEntry, "id" | "createdAt">) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 199)]);
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
        auditLogs,
        returnRecords,
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
    auditLogs,
    returnRecords,
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

    // Audit Log for product creation
    logAuditEvent({
      action: "PRODUCT_CREATED",
      description: `Added product ${newProduct.name} (₱${newProduct.sellingPrice.toFixed(2)})`,
      performedBy: currentStaff.name,
      recordId: newProduct.id,
    });

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
    setPendingSyncCount((c) => c + 1);

    logAuditEvent({
      action: "PRODUCT_UPDATED",
      description: `Updated product details for ID ${id}`,
      performedBy: currentStaff.name,
      recordId: id,
    });

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

    logAuditEvent({
      action: "SETTINGS_CHANGED",
      description: `Removed product ID ${id}`,
      performedBy: currentStaff.name,
      recordId: id,
    });

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
          logAuditEvent({
            action: "STOCK_ADJUSTED",
            description: `Stock adjusted for ${p.name}: ${delta > 0 ? "+" : ""}${delta} (${reason})`,
            performedBy: currentStaff.name,
            recordId: id,
            previousValue: `${p.stock}`,
            newValue: `${newStock}`,
          });
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
    splitDetail?: SplitPaymentDetail;
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
      splitDetail: data.splitDetail,
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

    // 3. Cash Drawer reconciliation
    if (data.paymentMethod === "CASH" && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashSales: prev.cashSales + data.total,
        expectedCash: prev.expectedCash + data.total,
      }));
    } else if (data.paymentMethod === "SPLIT" && data.splitDetail && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashSales: prev.cashSales + data.splitDetail!.cashAmount,
        expectedCash: prev.expectedCash + data.splitDetail!.cashAmount,
      }));
    }

    setTransactions((prev) => [newTxn, ...prev]);
    setPendingSyncCount((c) => c + 1);

    // 4. Log Audit Event
    logAuditEvent({
      action: "SALE_CREATED",
      description: `Sale ${receiptNum} completed for ₱${data.total.toFixed(2)} (${data.paymentMethod})`,
      performedBy: currentStaff.name,
      recordId: newTxn.id,
      newValue: `₱${data.total.toFixed(2)}`,
    });

    // 5. Insert into Supabase transactions
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

  // Void Transaction (Restores inventory, reverses financial impact, marks VOIDED)
  const voidTransaction = (params: {
    transactionId: string;
    reason: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const txn = transactions.find((t) => t.id === params.transactionId);
    if (!txn) return { success: false, error: "Transaction not found." };
    if (txn.status === "VOIDED" || txn.status === "VOID") {
      return { success: false, error: "Transaction is already voided." };
    }

    // 1. Restore inventory stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = txn.items.find((i) => i.product.id === p.id);
        if (item) {
          const restoredStock = p.stock + item.quantity;
          if (supabase && isSupabaseConfigured()) {
            supabase
              .from("products")
              .update({ stock: restoredStock, updated_at: new Date().toISOString() })
              .eq("id", p.id)
              .then();
          }
          return { ...p, stock: restoredStock, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );

    // 2. Reverse customer debt if credit/utang
    if (txn.paymentMethod === "CREDIT_UTANG" && txn.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === txn.customerId) {
            const restoredDebt = Math.max(0, c.totalDebt - txn.total);
            if (supabase && isSupabaseConfigured()) {
              supabase.from("customers").update({ total_debt: restoredDebt }).eq("id", c.id).then();
            }
            return { ...c, totalDebt: restoredDebt };
          }
          return c;
        })
      );

      const debtEntry: DebtEntry = {
        id: `debt-void-${Date.now()}`,
        customerId: txn.customerId,
        customerName: txn.customerName || "Customer",
        transactionId: txn.id,
        type: "PAYMENT_RECEIVED", // Reverses the debt increase
        amount: txn.total,
        balanceAfter: Math.max(0, (customers.find((c) => c.id === txn.customerId)?.totalDebt || 0) - txn.total),
        notes: `VOIDED SALE: ${txn.receiptNumber} (${params.reason})`,
        date: new Date().toISOString(),
        recordedBy: currentStaff.name,
      };
      setDebtEntries((prev) => [debtEntry, ...prev]);
    }

    // 3. Adjust cash drawer if cash sale
    if (txn.paymentMethod === "CASH" && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashSales: Math.max(0, prev.cashSales - txn.total),
        expectedCash: Math.max(0, prev.expectedCash - txn.total),
      }));
    } else if (txn.paymentMethod === "SPLIT" && txn.splitDetail && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashSales: Math.max(0, prev.cashSales - txn.splitDetail!.cashAmount),
        expectedCash: Math.max(0, prev.expectedCash - txn.splitDetail!.cashAmount),
      }));
    }

    // 4. Update transaction status
    const voidTime = new Date().toISOString();
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === params.transactionId
          ? {
              ...t,
              status: "VOIDED",
              voidReason: params.reason,
              voidNotes: params.notes,
              voidedBy: currentStaff.name,
              voidedAt: voidTime,
            }
          : t
      )
    );

    // 5. Audit Log
    logAuditEvent({
      action: "SALE_VOIDED",
      description: `Transaction ${txn.receiptNumber} voided. Reason: ${params.reason}`,
      performedBy: currentStaff.name,
      recordId: txn.id,
      previousValue: `Total ₱${txn.total.toFixed(2)}`,
      newValue: "VOIDED",
    });

    if (supabase && isSupabaseConfigured()) {
      supabase
        .from("transactions")
        .update({ status: "VOIDED", notes: `VOIDED: ${params.reason}` })
        .eq("id", params.transactionId)
        .then();
    }

    setPendingSyncCount((c) => c + 1);
    return { success: true };
  };

  // Process Return / Refund (Item-level or entire order, updates inventory & records history)
  const processReturn = (params: {
    transactionId: string;
    returnedItems: { productId: string; quantity: number }[];
    reason: string;
    notes?: string;
  }): { success: boolean; error?: string; returnRecord?: ReturnRecord } => {
    const txn = transactions.find((t) => t.id === params.transactionId);
    if (!txn) return { success: false, error: "Transaction not found." };
    if (txn.status === "VOIDED" || txn.status === "VOID") {
      return { success: false, error: "Cannot return items from a voided transaction." };
    }

    // Calculate previously returned quantities for this transaction
    const previouslyReturnedQty: Record<string, number> = {};
    (txn.returnHistory || []).forEach((r) => {
      r.returnedItems.forEach((ri) => {
        previouslyReturnedQty[ri.productId] = (previouslyReturnedQty[ri.productId] || 0) + ri.quantity;
      });
    });

    const returnItemsDetail: ReturnItem[] = [];
    let totalRefundAmount = 0;

    for (const ret of params.returnedItems) {
      if (ret.quantity <= 0) continue;
      const originalItem = txn.items.find((i) => i.product.id === ret.productId);
      if (!originalItem) {
        return { success: false, error: `Product ${ret.productId} was not part of this transaction.` };
      }
      const alreadyReturned = previouslyReturnedQty[ret.productId] || 0;
      const maxReturnable = originalItem.quantity - alreadyReturned;
      if (ret.quantity > maxReturnable) {
        return {
          success: false,
          error: `Cannot return ${ret.quantity} units of ${originalItem.product.name}. Only ${maxReturnable} available to return.`,
        };
      }

      // Proportional refund calculation
      const effectiveItemPrice = originalItem.subtotal / originalItem.quantity;
      const refundForThisItem = Math.round(effectiveItemPrice * ret.quantity * 100) / 100;
      totalRefundAmount += refundForThisItem;

      returnItemsDetail.push({
        productId: ret.productId,
        productName: originalItem.product.name,
        quantity: ret.quantity,
        unitPrice: originalItem.product.sellingPrice,
        refundAmount: refundForThisItem,
      });
    }

    if (returnItemsDetail.length === 0) {
      return { success: false, error: "No valid items selected for return." };
    }

    // 1. Restore stock for returned items
    setProducts((prev) =>
      prev.map((p) => {
        const ret = returnItemsDetail.find((ri) => ri.productId === p.id);
        if (ret) {
          const restoredStock = p.stock + ret.quantity;
          if (supabase && isSupabaseConfigured()) {
            supabase
              .from("products")
              .update({ stock: restoredStock, updated_at: new Date().toISOString() })
              .eq("id", p.id)
              .then();
          }
          return { ...p, stock: restoredStock, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );

    // 2. Adjust Utang / Customer debt if credit
    if (txn.paymentMethod === "CREDIT_UTANG" && txn.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === txn.customerId) {
            const restoredDebt = Math.max(0, c.totalDebt - totalRefundAmount);
            if (supabase && isSupabaseConfigured()) {
              supabase.from("customers").update({ total_debt: restoredDebt }).eq("id", c.id).then();
            }
            return { ...c, totalDebt: restoredDebt };
          }
          return c;
        })
      );
    }

    // 3. Adjust Cash Drawer if cash refund
    if (txn.paymentMethod === "CASH" && cashDrawer.status === "OPEN") {
      setCashDrawer((prev) => ({
        ...prev,
        cashOut: prev.cashOut + totalRefundAmount,
        expectedCash: Math.max(0, prev.expectedCash - totalRefundAmount),
      }));
    }

    // 4. Create Return Record
    const returnRecord: ReturnRecord = {
      id: `ret-${Date.now()}`,
      transactionId: txn.id,
      receiptNumber: txn.receiptNumber,
      returnedItems: returnItemsDetail,
      totalRefundAmount,
      reason: params.reason,
      notes: params.notes,
      processedBy: currentStaff.name,
      createdAt: new Date().toISOString(),
    };

    setReturnRecords((prev) => [returnRecord, ...prev]);

    // Check if fully returned
    let allReturned = true;
    for (const item of txn.items) {
      const alreadyRet = previouslyReturnedQty[item.product.id] || 0;
      const justRet = returnItemsDetail.find((ri) => ri.productId === item.product.id)?.quantity || 0;
      if (alreadyRet + justRet < item.quantity) {
        allReturned = false;
        break;
      }
    }

    const newStatus: TransactionStatus = allReturned ? "REFUNDED" : "PARTIALLY_RETURNED";
    const newRefundedAmount = (txn.refundedAmount || 0) + totalRefundAmount;

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === params.transactionId
          ? {
              ...t,
              status: newStatus,
              refundedAmount: newRefundedAmount,
              returnHistory: [returnRecord, ...(t.returnHistory || [])],
            }
          : t
      )
    );

    // 5. Audit Log
    logAuditEvent({
      action: "ITEM_RETURNED",
      description: `Returned ${returnItemsDetail.length} item(s) from ${txn.receiptNumber}. Refund: ₱${totalRefundAmount.toFixed(2)}. Reason: ${params.reason}`,
      performedBy: currentStaff.name,
      recordId: txn.id,
      newValue: newStatus,
    });

    setPendingSyncCount((c) => c + 1);
    return { success: true, returnRecord };
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
      auditLogs,
      returnRecords,
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
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.returnRecords) setReturnRecords(data.returnRecords);
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
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setReturnRecords(INITIAL_RETURNS);
    localStorage.removeItem(STORAGE_KEY);
  };

  const verifyOwnerPin = (pin: string): boolean => {
    const ownerStaff = staffList.find((s) => s.role === "OWNER");
    const configuredPin = settings.ownerPin || ownerStaff?.pin || "1234";
    return pin.trim() === configuredPin.trim();
  };

  const hasPermission = (permission: keyof StaffPermissions): boolean => {
    if (currentStaff.role === "OWNER") return true;
    if (currentStaff.permissions && currentStaff.permissions[permission] !== undefined) {
      return currentStaff.permissions[permission];
    }
    if (currentStaff.role === "MANAGER") {
      return permission !== "canManageSettings" && permission !== "canManageUsers";
    }
    if (currentStaff.role === "CASHIER") {
      return permission === "canProcessSales";
    }
    if (currentStaff.role === "INVENTORY_STAFF") {
      return permission === "canManageInventory";
    }
    return false;
  };

  const addStaff = (staffData: Omit<StaffUser, "id" | "createdAt">): StaffUser => {
    const newStaff: StaffUser = {
      ...staffData,
      id: `staff-${Date.now()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setStaffList((prev) => [...prev, newStaff]);
    logAuditEvent({
      action: "USER_CREATED",
      description: `Created new staff user: ${newStaff.name} (${newStaff.role})`,
      performedBy: currentStaff.name,
      recordId: newStaff.id,
    });
    setPendingSyncCount((c) => c + 1);
    return newStaff;
  };

  const updateStaff = (id: string, updates: Partial<StaffUser>) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (currentStaff.id === id) {
      setCurrentStaff((prev) => ({ ...prev, ...updates }));
    }
    logAuditEvent({
      action: "USER_UPDATED",
      description: `Updated staff permissions/details for ID ${id}`,
      performedBy: currentStaff.name,
      recordId: id,
    });
    setPendingSyncCount((c) => c + 1);
  };

  const deleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    logAuditEvent({
      action: "SETTINGS_CHANGED",
      description: `Removed staff user ID ${id}`,
      performedBy: currentStaff.name,
      recordId: id,
    });
    setPendingSyncCount((c) => c + 1);
  };

  const toggleStaffActive = (id: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
    setPendingSyncCount((c) => c + 1);
  };

  const setFontSizeMode = (mode: "NORMAL" | "LARGE") => {
    updateSettings({ fontSizeMode: mode });
  };

  // Authentication & Session Management
  const loginWithPin = (staffId: string, pin: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) {
      return { success: false, error: "Staff account not found." };
    }
    if (!target.isActive) {
      return { success: false, error: "This staff account is currently deactivated." };
    }
    if (target.pin !== pin.trim()) {
      return { success: false, error: "Incorrect 4-digit PIN." };
    }

    setCurrentStaff(target);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("PADDLR_AUTH_SESSION", JSON.stringify({
          authenticated: true,
          staffId: target.id,
          staffName: target.name,
          role: target.role,
          timestamp: Date.now(),
        }));
      } catch {}
    }
    logAuditEvent({
      action: "USER_LOGIN",
      description: `Terminal PIN Login: ${target.name} (${target.role})`,
      performedBy: target.name,
      staffName: target.name,
      staffRole: target.role,
    });
    return { success: true };
  };

  const loginWithEmail = async (email: string, pass: string): Promise<{ error?: string }> => {
    setIsAuthLoading(true);
    try {
      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });
        if (error) {
          setIsAuthLoading(false);
          return { error: error.message };
        }
        if (data.user) {
          setSessionUser(data.user);
        }
      }
      const matched = staffList.find(
        (s) => s.email.toLowerCase() === email.trim().toLowerCase()
      );
      const activeUser = matched || staffList.find((s) => s.role === "OWNER") || staffList[0];
      setCurrentStaff(activeUser);
      setIsAuthenticated(true);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("PADDLR_AUTH_SESSION", JSON.stringify({
            authenticated: true,
            email: email.trim(),
            staffId: activeUser.id,
            staffName: activeUser.name,
            role: activeUser.role,
            timestamp: Date.now(),
          }));
        } catch {}
      }

      logAuditEvent({
        action: "USER_LOGIN",
        description: `Cloud Account Login: ${email} as ${activeUser.name} (${activeUser.role})`,
        performedBy: activeUser.name,
        staffName: activeUser.name,
        staffRole: activeUser.role,
      });

      setIsAuthLoading(false);
      return {};
    } catch (e: any) {
      setIsAuthLoading(false);
      return { error: e.message || "Failed to authenticate." };
    }
  };

  const registerStoreAccount = async (email: string, pass: string, storeName?: string): Promise<{ error?: string; success?: boolean }> => {
    setIsAuthLoading(true);
    try {
      if (!supabase || !isSupabaseConfigured()) {
        setIsAuthLoading(false);
        return { error: "Supabase cloud client is not configured." };
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            store_name: storeName || settings.storeName,
          }
        }
      });
      setIsAuthLoading(false);
      if (error) {
        return { error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      setIsAuthLoading(false);
      return { error: e.message || "Registration failed." };
    }
  };

  const logout = async () => {
    logAuditEvent({
      action: "USER_LOGOUT",
      description: `Staff member ${currentStaff.name} logged out / locked terminal`,
      performedBy: currentStaff.name,
      staffName: currentStaff.name,
      staffRole: currentStaff.role,
    });

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setSessionUser(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("PADDLR_AUTH_SESSION");
      } catch {}
    }
  };

  const quickDemoLogin = (role: UserRole) => {
    const target = staffList.find((s) => s.role === role) || staffList[0];
    setCurrentStaff(target);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("PADDLR_AUTH_SESSION", JSON.stringify({
          authenticated: true,
          staffId: target.id,
          staffName: target.name,
          role: target.role,
          timestamp: Date.now(),
        }));
      } catch {}
    }
    logAuditEvent({
      action: "USER_LOGIN",
      description: `Quick Demo Login: ${target.name} (${target.role})`,
      performedBy: target.name,
      staffName: target.name,
      staffRole: target.role,
    });
  };

  const signInWithEmail = loginWithEmail;
  const signOut = logout;

  // Business Template / Preset Loader
  const loadShopPreset = (presetKey: "SARI_SARI" | "MOTOR_SHOP" | "PHARMACY" | "MILK_TEA") => {
    const preset = ALL_SHOP_PRESETS[presetKey];
    if (!preset) return;

    setProducts(preset.products);
    setCustomers(preset.customers);
    setDebtEntries(preset.debtEntries);
    setTransactions(preset.transactions);
    setExpenses(preset.expenses);
    setCashDrawer(preset.cashDrawer);
    setSettings(preset.settings);
    setCurrentShopPreset(presetKey);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("PADDLR_CURRENT_PRESET", presetKey);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          products: preset.products,
          customers: preset.customers,
          debtEntries: preset.debtEntries,
          transactions: preset.transactions,
          expenses: preset.expenses,
          cashDrawer: preset.cashDrawer,
          settings: preset.settings,
          staffList,
          currentStaff,
          auditLogs,
          returnRecords,
        }));
      } catch {}
    }

    logAuditEvent({
      action: "PRESET_LOADED",
      description: `Loaded Business Template: ${preset.name} (${preset.badge})`,
      performedBy: currentStaff.name,
      staffName: currentStaff.name,
      staffRole: currentStaff.role,
    });
  };

  const toggleProductBestseller = (productId: string) => {
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === productId ? { ...p, isBestseller: !p.isBestseller } : p
      );
      if (typeof window !== "undefined") {
        try {
          const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, products: updated }));
        } catch {}
      }
      return updated;
    });
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
        syncStatus,
        auditLogs,
        returnRecords,
        sessionUser,
        isAuthLoading,
        isAuthenticated,
        currentShopPreset,
        loginWithPin,
        loginWithEmail,
        registerStoreAccount,
        logout,
        quickDemoLogin,
        loadShopPreset,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustProductStock,
        processCheckout,
        voidTransaction,
        processReturn,
        addCustomer,
        updateCustomer,
        recordDebtPayment,
        addManualDebt,
        addExpense,
        openCashDrawer,
        closeCashDrawer,
        logCashAdjustment,
        logAuditEvent,
        addStaff,
        updateStaff,
        deleteStaff,
        toggleStaffActive,
        switchStaff,
        hasPermission,
        verifyOwnerPin,
        updateSettings,
        setFontSizeMode,
        toggleProductBestseller,
        signInWithEmail,
        signOut,
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
