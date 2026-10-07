"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Product, Customer, Expense, Transaction, StaffUser, UserRole, StoreSettings, CashDrawerShift, DebtEntry, AuditLogEntry, ReturnRecord, StaffPermissions, CartItem } from "@/types";
import { INITIAL_STAFF } from "@/data/mockData";
import { ALL_SHOP_PRESETS, type ShopPreset } from "@/data/shopPresets";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { assert, nonnegative, positive, validateProduct, validateCheckout, calculateReturn, money, businessDate, type CheckoutInput } from "@/lib/commerce";
import { toast } from "sonner";

type PresetKey = ShopPreset["id"];
export interface StockReceipt { id: string; supplier: string; reference: string; date: string; total: number; lines: { productId: string; quantity: number; cost: number }[]; paymentMethod: "CASH" | "GCASH" | "BANK" }
export interface HeldCart { id: string; name: string; items: CartItem[]; createdAt: string }
interface StoreData {
  products: Product[]; customers: Customer[]; debtEntries: DebtEntry[]; transactions: Transaction[]; expenses: Expense[];
  cashDrawer: CashDrawerShift; settings: StoreSettings; staffList: StaffUser[]; currentStaff: StaffUser;
  auditLogs: AuditLogEntry[]; returnRecords: ReturnRecord[]; stockReceipts: StockReceipt[]; shiftHistory: CashDrawerShift[];
  cart: CartItem[]; heldCarts: HeldCart[]; revision: number; currentShopPreset: PresetKey;
}
const PREFIX = "PADDL_WORKSPACE_V4_";
const ACTIVE = "PADDLR_CURRENT_PRESET";
const id = (prefix: string) => prefix + "-" + crypto.randomUUID();
const now = () => new Date().toISOString();
function seed(key: PresetKey): StoreData {
  const p = structuredClone(ALL_SHOP_PRESETS[key]);
  return { products: p.products, customers: p.customers, debtEntries: p.debtEntries, transactions: p.transactions, expenses: p.expenses, settings: p.settings,
    cashDrawer: p.cashDrawer, staffList: structuredClone(INITIAL_STAFF), currentStaff: structuredClone(INITIAL_STAFF[0]), auditLogs: [], returnRecords: [], stockReceipts: [], shiftHistory: [], cart: [], heldCarts: [], revision: 0, currentShopPreset: key };
}
function validateBackup(value: unknown): asserts value is StoreData {
  assert(value && typeof value === "object", "Invalid backup.");
  const s = value as StoreData;
  assert(s.currentShopPreset in ALL_SHOP_PRESETS, "Unknown industry in backup.");
  for (const key of ["products", "customers", "transactions", "debtEntries", "expenses", "staffList", "auditLogs", "returnRecords", "cart", "heldCarts", "stockReceipts", "shiftHistory"] as const) assert(Array.isArray(s[key]), "Backup is missing " + key);
  assert(s.settings?.storeName && s.cashDrawer && s.currentStaff?.id && s.staffList.some(u => u.role === "OWNER" && u.isActive), "Backup is missing store or owner details.");
  assert(Number.isSafeInteger(s.revision) && s.revision >= 0, "Invalid backup revision.");
  const ids = new Set<string>();
  s.products.forEach(p => { assert(p.id && !ids.has(p.id), "Duplicate or missing product ID."); ids.add(p.id); validateProduct(p); });
  s.customers.forEach(c => { assert(typeof c.name === "string" && typeof c.phone === "string", "Invalid customer."); nonnegative(c.totalDebt, "Customer balance"); nonnegative(c.creditLimit, "Credit limit"); });
  s.transactions.forEach(t => { assert(t.id && Array.isArray(t.items) && Number.isFinite(Date.parse(t.createdAt)), "Invalid sale."); nonnegative(t.total, "Sale total"); t.items.forEach(i => { positive(i.quantity, "Sale quantity"); nonnegative(i.subtotal, "Line subtotal"); validateProduct(i.product); }); });
  s.expenses.forEach(e => positive(e.amount, "Expense"));
  s.debtEntries.forEach(e => { nonnegative(e.amount, "Debt entry"); nonnegative(e.balanceAfter, "Debt balance"); });
  nonnegative(s.cashDrawer.openingCash, "Opening cash"); assert(Number.isFinite(s.cashDrawer.expectedCash), "Invalid cash drawer.");
}
function useStoreState() {
  const [state, setState] = useState<StoreData>(() => seed("SARI_SARI"));
  const ref = useRef(state);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isOnline, setOnline] = useState(true);
  const [isSyncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isAuthLoading, setAuthLoading] = useState(false);
  const cloudRevision = useRef<number | null>(null);
  const cloudKey = useRef<string | null>(null);
  const syncedLocalRevision = useRef(-1);
  const syncing = useRef(false);
  const ownerApproval = useRef(0);
  function apply(s: StoreData) { ref.current = s; setState(s); }
  useEffect(() => {
    try {
      const selected = localStorage.getItem(ACTIVE) as PresetKey;
      const key = selected in ALL_SHOP_PRESETS ? selected : "SARI_SARI";
      const saved = localStorage.getItem(PREFIX + key);
      let initial = seed(key);
      if (saved) { const parsed = JSON.parse(saved); validateBackup(parsed); initial = parsed; }
      else {
        const legacy = localStorage.getItem("PEDDLR_PRO_STORE_V3");
        if (legacy) { const migrated = { ...initial, ...JSON.parse(legacy), currentShopPreset: key, revision: 0 }; validateBackup(migrated); initial = migrated; }
      }
      apply(initial);
      const auth = JSON.parse(sessionStorage.getItem("PADDL_SESSION") || "null");
      if (auth?.staffId && initial.staffList.some(s => s.id === auth.staffId && s.isActive)) {
        apply({ ...initial, currentStaff: initial.staffList.find(s => s.id === auth.staffId)! }); setAuthenticated(true);
      }
    } catch { toast.error("Saved data could not be loaded. Your original backup has been preserved. Restore a valid backup in Settings."); }
    setMounted(true); setOnline(navigator.onLine);
    const online = () => setOnline(true), offline = () => setOnline(false);
    const storage = (e: StorageEvent) => {
      if (e.key === PREFIX + ref.current.currentShopPreset && e.newValue) {
        try { const next = JSON.parse(e.newValue); validateBackup(next); if (next.revision > ref.current.revision) apply({ ...next, currentStaff: ref.current.currentStaff }); } catch { /* Keep last known good state. */ }
      }
    };
    window.addEventListener("online", online); window.addEventListener("offline", offline); window.addEventListener("storage", storage);
    const auth = supabase?.auth.onAuthStateChange((_event, session) => { setSessionUser(session?.user || null); cloudRevision.current = null; cloudKey.current = null; syncedLocalRevision.current = -1; setLastSyncedAt(null); });
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); window.removeEventListener("storage", storage); auth?.data.subscription.unsubscribe(); };
  }, []);
  function commit<T>(operation: (draft: StoreData) => T): T {
    assert(mounted, "Store is still loading.");
    const s = ref.current;
    const disk = localStorage.getItem(PREFIX + s.currentShopPreset);
    if (disk) {
      const latest = JSON.parse(disk);
      if (latest.revision > s.revision) { validateBackup(latest); apply({ ...latest, currentStaff: s.currentStaff }); throw new Error("This store changed in another tab. Review the refreshed data and try again."); }
    }
    const next = structuredClone(s);
    const result = operation(next); next.revision++;
    try { localStorage.setItem(PREFIX + next.currentShopPreset, JSON.stringify(next)); }
    catch { throw new Error("Could not save on this device. Free browser storage or export a backup before continuing."); }
    apply(next); return result;
  }
  function safely(operation: (draft: StoreData) => void) { try { commit(operation); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save."); } }
  function audit(s: StoreData, action: AuditLogEntry["action"], description: string) {
    s.auditLogs.unshift({ id: id("audit"), action, description, performedBy: s.currentStaff.name, staffName: s.currentStaff.name, staffRole: s.currentStaff.role, createdAt: now() });
  }
  function hasPermission(permission: keyof StaffPermissions) {
    const staff = ref.current.currentStaff;
    if (!staff.isActive) return false;
    if (staff.role === "OWNER") return true;
    const aliases: Partial<Record<keyof StaffPermissions, keyof StaffPermissions>> = { canViewReports: "canViewFinancialReports", canManageSettings: "canModifySettings", canManageUsers: "canManageStaff" };
    const explicit = staff.permissions?.[permission] ?? staff.permissions?.[aliases[permission] as keyof StaffPermissions];
    if (explicit !== undefined) return explicit;
    if (staff.role === "MANAGER") return !["canManageSettings", "canModifySettings", "canManageUsers", "canManageStaff"].includes(permission);
    return staff.role === "CASHIER" ? permission === "canProcessSales" : permission === "canManageInventory";
  }
  function requirePermission(permission: keyof StaffPermissions) { assert(hasPermission(permission) || Date.now() < ownerApproval.current, "Owner approval is required for this action."); }
  const logAuditEvent = (entry: Omit<AuditLogEntry, "id" | "createdAt">) => safely(s => { s.auditLogs.unshift({ ...entry, id: id("audit"), createdAt: now() }); });
  const addProduct = (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => commit(s => {
    requirePermission("canManageInventory"); const p = { ...data, id: id("prod"), createdAt: now(), updatedAt: now() }; validateProduct(p);
    assert(!p.barcode || !s.products.some(x => x.barcode === p.barcode), "Barcode already belongs to another product.");
    s.products.unshift(p); audit(s, "PRODUCT_CREATED", "Added " + p.name); return p;
  });
  const updateProduct = (pid: string, updates: Partial<Product>) => safely(s => {
    requirePermission("canManageInventory"); const index = s.products.findIndex(p => p.id === pid); assert(index >= 0, "Product not found.");
    const p = { ...s.products[index], ...updates, id: pid, updatedAt: now() }; validateProduct(p);
    assert(!p.barcode || !s.products.some(x => x.id !== pid && x.barcode === p.barcode), "Barcode already in use.");
    s.products[index] = p; audit(s, "PRODUCT_UPDATED", "Updated " + p.name);
  });
  const deleteProduct = (pid: string) => updateProduct(pid, { isActive: false });
  const adjustProductStock = (pid: string, delta: number, reason: string) => safely(s => {
    requirePermission("canManageInventory"); const p = s.products.find(p => p.id === pid); assert(p, "Product not found."); assert(reason.trim(), "Enter a stock adjustment reason."); nonnegative(p.stock + delta, "Resulting stock");
    p.stock = money(p.stock + delta); p.updatedAt = now(); audit(s, "STOCK_ADJUSTED", p.name + ": " + delta + " (" + reason + ")");
  });
  const processCheckout = (data: CheckoutInput): Transaction => commit(s => {
    if (data.requestId) { const existing = s.transactions.find(t => t.requestId === data.requestId); if (existing) return existing; }
    requirePermission("canProcessSales");
    const checked = validateCheckout(data, s.products, s.customers);
    if (checked.cashReceived > 0 && !data.isBackdated) assert(s.cashDrawer.status === "OPEN", "Open a cash shift before accepting cash.");
    const txn: Transaction = { ...data, ...checked, id: id("txn"), receiptNumber: "PD-" + businessDate().replaceAll("-", "") + "-" + crypto.randomUUID().slice(0, 8).toUpperCase(), status: "COMPLETED", cashierName: s.currentStaff.name, createdAt: data.customDate || now(), amountTendered: data.paymentMethod === "CREDIT_UTANG" ? 0 : data.amountTendered };
    if (txn.splitDetail) txn.splitDetail = { ...txn.splitDetail, cashAmount: checked.cashReceived };
    checked.items.forEach(item => { const p = s.products.find(p => p.id === item.product.id)!; p.stock = money(p.stock - item.quantity); p.updatedAt = now(); });
    if (txn.paymentMethod === "CREDIT_UTANG") {
      const c = s.customers.find(c => c.id === txn.customerId)!; c.totalDebt = money(c.totalDebt + txn.total); txn.customerName = c.name;
      s.debtEntries.unshift({ id: id("debt"), customerId: c.id, customerName: c.name, transactionId: txn.id, type: "DEBT_INCREASE", amount: txn.total, balanceAfter: c.totalDebt, notes: txn.receiptNumber, date: txn.createdAt, recordedBy: s.currentStaff.name });
    }
    if (!data.isBackdated) { s.cashDrawer.cashSales = money(s.cashDrawer.cashSales + checked.cashReceived); s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash + checked.cashReceived); }
    s.transactions.unshift(txn); s.cart = []; audit(s, "SALE_CREATED", txn.receiptNumber + ": ₱" + txn.total.toFixed(2) + " via " + txn.paymentMethod); return txn;
  });
  function reversePayment(s: StoreData, txn: Transaction, amount: number) {
    if (txn.paymentMethod === "CREDIT_UTANG") {
      const c = s.customers.find(c => c.id === txn.customerId); assert(c, "Customer no longer exists.");
      assert(c.totalDebt >= amount, "This credit has already been repaid. Reconcile the customer's repayment before reversing the sale.");
      c.totalDebt = money(c.totalDebt - amount);
      s.debtEntries.unshift({ id: id("debt"), customerId: c.id, customerName: c.name, transactionId: txn.id, type: "DEBT_ADJUSTMENT", amount, balanceAfter: c.totalDebt, notes: "Sale reversal: " + txn.receiptNumber, date: now(), recordedBy: s.currentStaff.name });
    }
    const previous = txn.refundedAmount || 0;
    const cash = txn.paymentMethod === "CASH" ? amount : txn.paymentMethod === "SPLIT" ? money(money((previous + amount) * (txn.splitDetail?.cashAmount || 0) / (txn.total || 1)) - money(previous * (txn.splitDetail?.cashAmount || 0) / (txn.total || 1))) : 0;
    if (cash > 0) { assert(s.cashDrawer.status === "OPEN", "Open a cash shift to issue the cash refund."); s.cashDrawer.cashOut = money(s.cashDrawer.cashOut + cash); s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash - cash); }
  }
  const voidTransaction = (params: { transactionId: string; reason: string; notes?: string }) => {
    try { commit(s => {
      requirePermission("canVoidTransactions"); const t = s.transactions.find(t => t.id === params.transactionId); assert(t, "Sale not found."); assert(t.status === "COMPLETED", "Only an unreturned, completed sale can be voided."); assert(params.reason.trim(), "Enter a reason.");
      reversePayment(s, t, t.total); t.items.forEach(i => { const p = s.products.find(p => p.id === i.product.id); if (p) p.stock = money(p.stock + i.quantity); });
      t.status = "VOIDED"; t.voidReason = params.reason; t.voidNotes = params.notes; t.voidedAt = now(); t.voidedBy = s.currentStaff.name;
      audit(s, "SALE_VOIDED", t.receiptNumber + ": " + params.reason);
    }); return { success: true }; } catch (e) { return { success: false, error: (e as Error).message }; }
  };
  const processReturn = (params: { transactionId: string; returnedItems: { productId: string; quantity: number }[]; reason: string; notes?: string; restock?: boolean }) => {
    try { const returnRecord = commit(s => {
      requirePermission("canProcessReturns"); const t = s.transactions.find(t => t.id === params.transactionId); assert(t, "Sale not found."); assert(params.reason.trim(), "Enter a return reason.");
      const returnedItems = calculateReturn(t, params.returnedItems); const totalRefundAmount = money(returnedItems.reduce((a, i) => a + i.refundAmount, 0));
      reversePayment(s, t, totalRefundAmount);
      const record: ReturnRecord = { id: id("return"), transactionId: t.id, receiptNumber: t.receiptNumber, returnedItems, totalRefundAmount, restocked: params.restock !== false, reason: params.reason, notes: params.notes, processedBy: s.currentStaff.name, createdAt: now() };
      if (record.restocked) returnedItems.forEach(i => { const p = s.products.find(p => p.id === i.productId); if (p) p.stock = money(p.stock + i.quantity); });
      t.returnHistory = [...(t.returnHistory || []), record]; t.refundedAmount = money((t.refundedAmount || 0) + totalRefundAmount);
      t.status = t.items.every(i => t.returnHistory!.flatMap(r => r.returnedItems).filter(r => r.productId === i.product.id).reduce((a, r) => a + r.quantity, 0) >= i.quantity) ? "REFUNDED" : "PARTIALLY_RETURNED";
      s.returnRecords.unshift(record); audit(s, "ITEM_RETURNED", t.receiptNumber + ": refunded ₱" + totalRefundAmount.toFixed(2) + ". " + params.reason); return record;
    }); return { success: true, returnRecord }; } catch (e) { return { success: false, error: (e as Error).message }; }
  };
  const addCustomer = (data: Omit<Customer, "id" | "createdAt" | "totalDebt">) => commit(s => { requirePermission("canProcessSales"); assert(data.name.trim(), "Enter a customer name."); nonnegative(data.creditLimit, "Credit limit"); const c = { ...data, id: id("customer"), totalDebt: 0, createdAt: now() }; s.customers.unshift(c); return c; });
  const updateCustomer = (cid: string, updates: Partial<Customer>) => safely(s => { requirePermission("canProcessSales"); const c = s.customers.find(c => c.id === cid); assert(c, "Customer not found."); Object.assign(c, updates, { id: cid, totalDebt: c.totalDebt }); nonnegative(c.creditLimit, "Credit limit"); });
  const changeDebt = (cid: string, amount: number, payment: boolean, method: "CASH" | "GCASH", notes = "") => commit(s => {
    requirePermission("canProcessSales"); positive(amount, "Amount"); const c = s.customers.find(c => c.id === cid); assert(c, "Customer not found.");
    assert(payment ? amount <= c.totalDebt : money(c.totalDebt + amount) <= c.creditLimit, payment ? "Payment exceeds the outstanding balance." : "Customer credit limit exceeded.");
    if (payment && method === "CASH") { assert(s.cashDrawer.status === "OPEN", "Open a cash shift before collecting cash."); s.cashDrawer.cashIn = money(s.cashDrawer.cashIn + amount); s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash + amount); }
    c.totalDebt = money(c.totalDebt + (payment ? -amount : amount));
    s.debtEntries.unshift({ id: id("debt"), customerId: cid, customerName: c.name, type: payment ? "PAYMENT_RECEIVED" : "DEBT_INCREASE", amount, balanceAfter: c.totalDebt, notes: notes || (payment ? "Payment via " + method : "Manual credit"), date: now(), recordedBy: s.currentStaff.name });
    audit(s, "SETTINGS_CHANGED", c.name + ": " + (payment ? "payment" : "credit") + " ₱" + amount.toFixed(2));
  });
  const recordDebtPayment = (cid: string, amount: number, method: "CASH" | "GCASH", notes?: string) => changeDebt(cid, amount, true, method, notes);
  const addManualDebt = (cid: string, amount: number, notes: string) => changeDebt(cid, amount, false, "CASH", notes);
  function expense(s: StoreData, data: Omit<Expense, "id" | "date" | "recordedBy">) {
    positive(data.amount, "Expense"); assert(data.description.trim(), "Describe the expense.");
    if (data.paymentMethod === "CASH") { assert(s.cashDrawer.status === "OPEN", "Open a cash shift before recording a cash expense."); s.cashDrawer.cashOut = money(s.cashDrawer.cashOut + data.amount); s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash - data.amount); }
    const e = { ...data, id: id("expense"), date: now(), recordedBy: s.currentStaff.name }; s.expenses.unshift(e); return e;
  }
  const addExpense = (data: Omit<Expense, "id" | "date" | "recordedBy">) => commit(s => { requirePermission("canProcessSales"); const e = expense(s, data); audit(s, "SETTINGS_CHANGED", "Expense: " + e.description + " ₱" + e.amount); return e; });
  const receiveStock = (data: Omit<StockReceipt, "id" | "date" | "total">) => commit(s => {
    requirePermission("canManageInventory"); assert(data.supplier.trim() && data.lines.length, "Enter a supplier and at least one item.");
    const seen = new Set<string>(); let total = 0;
    data.lines.forEach(line => { assert(!seen.has(line.productId), "Duplicate receiving line."); seen.add(line.productId); positive(line.quantity, "Quantity"); nonnegative(line.cost, "Unit cost"); const p = s.products.find(p => p.id === line.productId); assert(p?.isActive, "Product no longer available.");
      p.costPrice = money((p.stock * p.costPrice + line.quantity * line.cost) / (p.stock + line.quantity)); p.stock = money(p.stock + line.quantity); p.updatedAt = now(); total = money(total + line.quantity * line.cost);
    });
    const receipt = { ...data, id: id("purchase"), date: now(), total }; s.stockReceipts.unshift(receipt);
    if (total > 0) expense(s, { category: "Supplier & Stock Restock", amount: total, description: "Stock received from " + data.supplier, paymentMethod: data.paymentMethod, receiptRef: data.reference });
    audit(s, "STOCK_ADJUSTED", "Received " + data.lines.length + " products from " + data.supplier + ": ₱" + total); return receipt;
  });
  const openCashDrawer = (openingAmount: number, notes?: string) => safely(s => { requirePermission("canProcessSales"); assert(s.cashDrawer.status === "CLOSED", "A shift is already open."); nonnegative(openingAmount, "Opening float"); s.cashDrawer = { id: id("shift"), openedAt: now(), openedBy: s.currentStaff.name, openingCash: openingAmount, startingFloat: openingAmount, cashSales: 0, cashIn: 0, cashOut: 0, expectedCash: openingAmount, status: "OPEN", notes }; audit(s, "SETTINGS_CHANGED", "Opened shift with ₱" + openingAmount); });
  const closeCashDrawer = (actualCash: number, notes?: string) => safely(s => { requirePermission("canProcessSales"); assert(s.cashDrawer.status === "OPEN", "Shift is already closed."); nonnegative(actualCash, "Counted cash"); Object.assign(s.cashDrawer, { status: "CLOSED", closedAt: now(), closedBy: s.currentStaff.name, actualCash, discrepancy: money(actualCash - s.cashDrawer.expectedCash), notes }); s.shiftHistory.unshift({ ...s.cashDrawer }); audit(s, "SETTINGS_CHANGED", "Closed shift; variance ₱" + s.cashDrawer.discrepancy); });
  const logCashAdjustment = (amount: number, type: "IN" | "OUT", reason: string) => safely(s => { requirePermission("canProcessSales"); assert(s.cashDrawer.status === "OPEN", "Open a shift first."); positive(amount, "Amount"); assert(reason.trim(), "Enter a reason."); s.cashDrawer[type === "IN" ? "cashIn" : "cashOut"] += amount; s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash + (type === "IN" ? amount : -amount)); audit(s, "SETTINGS_CHANGED", "Cash " + type + ": ₱" + amount + ". " + reason); });
  const updateSettings = (updates: Partial<StoreSettings>) => safely(s => { requirePermission("canManageSettings"); Object.assign(s.settings, updates); audit(s, "SETTINGS_CHANGED", "Store settings updated"); });
  const verifyOwnerPin = (pin: string) => { const owner = ref.current.staffList.find(s => s.role === "OWNER" && s.isActive); const valid = !!owner && pin.trim() === (ref.current.settings.ownerPin || owner.pin); if (valid) ownerApproval.current = Date.now() + 60_000; return valid; };
  const addStaff = (data: Omit<StaffUser, "id" | "createdAt">) => commit(s => { requirePermission("canManageUsers"); assert(/^\d{4}$/.test(data.pin), "Use a four-digit PIN."); const staff = { ...data, id: id("staff"), createdAt: now() }; s.staffList.push(staff); audit(s, "USER_CREATED", "Added " + staff.name); return staff; });
  const updateStaff = (sid: string, updates: Partial<StaffUser>) => safely(s => { requirePermission("canManageUsers"); const staff = s.staffList.find(u => u.id === sid); assert(staff, "Staff not found."); Object.assign(staff, updates, { id: sid }); assert(s.staffList.some(u => u.isActive && u.role === "OWNER"), "Keep at least one active owner."); if (staff.id === s.currentStaff.id) s.currentStaff = { ...staff }; audit(s, "USER_UPDATED", "Updated " + staff.name); });
  const deleteStaff = (sid: string) => updateStaff(sid, { isActive: false });
  const toggleStaffActive = (sid: string) => updateStaff(sid, { isActive: !ref.current.staffList.find(s => s.id === sid)?.isActive });
  function startSession(staff: StaffUser) { ownerApproval.current = 0; apply({ ...ref.current, currentStaff: staff }); sessionStorage.setItem("PADDL_SESSION", JSON.stringify({ staffId: staff.id })); setAuthenticated(true); }
  const loginWithPin = (sid: string, pin: string) => { const staff = ref.current.staffList.find(s => s.id === sid && s.isActive); if (!staff || staff.pin !== pin.trim()) return { success: false, error: "Incorrect PIN or inactive staff account." }; startSession(staff); return { success: true }; };
  const switchStaff = (_sid: string) => { toast.info("Use Switch staff and enter that staff member's PIN."); };
  const quickDemoLogin = (role: UserRole) => { const staff = ref.current.staffList.find(s => s.role === role && s.isActive); if (staff) startSession(staff); };
  const loginWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: "Cloud is not configured. Use a demo or staff PIN." };
    setAuthLoading(true);
    try { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; setSessionUser(data.user); return {}; }
    catch (e) { return { error: (e as Error).message }; } finally { setAuthLoading(false); }
  };
  const registerStoreAccount = async (email: string, password: string, storeName?: string) => {
    if (!supabase) return { error: "Cloud is not configured." }; setAuthLoading(true);
    try { const { error } = await supabase.auth.signUp({ email, password, options: { data: { store_name: storeName } } }); if (error) throw error; return { success: true }; } catch (e) { return { error: (e as Error).message }; } finally { setAuthLoading(false); }
  };
  const logout = async () => { await supabase?.auth.signOut(); setSessionUser(null); setAuthenticated(false); sessionStorage.removeItem("PADDL_SESSION"); ownerApproval.current = 0; };
  const loadShopPreset = (key: PresetKey) => {
    try {
      assert(!syncing.current, "Wait for the cloud backup to finish before switching workspaces.");
      assert(key in ALL_SHOP_PRESETS, "Unknown industry."); localStorage.setItem(PREFIX + ref.current.currentShopPreset, JSON.stringify(ref.current));
      const saved = localStorage.getItem(PREFIX + key); const next = saved ? JSON.parse(saved) : seed(key); validateBackup(next);
      localStorage.setItem(ACTIVE, key); apply(next); cloudRevision.current = null; cloudKey.current = null; syncedLocalRevision.current = -1; setLastSyncedAt(null); setSyncError(null); ownerApproval.current = 0;
    } catch (e) { toast.error((e as Error).message); }
  };
  const exportDataJson = () => JSON.stringify({ ...ref.current, schemaVersion: 4, exportedAt: now() }, null, 2);
  const importDataJson = (json: string) => {
    try { requirePermission("canManageSettings"); const data = JSON.parse(json); validateBackup(data); assert(data.currentShopPreset === ref.current.currentShopPreset, "Switch to the backup's industry before restoring.");
      localStorage.setItem("PADDL_RECOVERY_" + Date.now(), JSON.stringify(ref.current)); data.revision = ref.current.revision + 1; localStorage.setItem(PREFIX + data.currentShopPreset, JSON.stringify(data)); apply(data); ownerApproval.current = 0; return true;
    } catch (e) { toast.error((e as Error).message); return false; }
  };
  const resetToDemoData = () => { try { requirePermission("canManageSettings"); localStorage.setItem("PADDL_RECOVERY_" + Date.now(), JSON.stringify(ref.current)); const next = seed(ref.current.currentShopPreset); next.revision = ref.current.revision + 1; localStorage.setItem(PREFIX + next.currentShopPreset, JSON.stringify(next)); apply(next); } catch (e) { toast.error((e as Error).message); } };
  const syncCloud = async () => {
    if (syncing.current) return;
    if (!supabase || !sessionUser) { toast.info("Saved on this device. Sign in to cloud in Settings to back it up."); return; }
    if (!navigator.onLine) { toast.info("You are offline. Changes remain saved on this device."); return; }
    syncing.current = true; setSyncing(true); setSyncError(null);
    const snapshot = structuredClone(ref.current); const key = sessionUser.id + ":" + snapshot.currentShopPreset;
    try {
      if (cloudKey.current !== key) {
        const { data, error } = await supabase.from("paddl_backups").select("revision").eq("owner_id", sessionUser.id).eq("workspace", snapshot.currentShopPreset).maybeSingle(); if (error) throw error;
        assert(!data, "A cloud backup already exists. Restore it in Settings before saving from this device to avoid overwriting another device's work.");
        cloudRevision.current = 0; cloudKey.current = key;
      }
      const { data, error } = await supabase.rpc("save_paddl_backup", { p_workspace: snapshot.currentShopPreset, p_expected_revision: cloudRevision.current, p_payload: snapshot });
      if (error) throw error; cloudRevision.current = Number(data); syncedLocalRevision.current = snapshot.revision; setLastSyncedAt(now()); toast.success("Cloud backup saved.");
    } catch (e) { const message = (e as Error).message || "Cloud backup failed."; setSyncError(message); toast.error(message); }
    finally { syncing.current = false; setSyncing(false); }
  };
  const restoreCloud = async () => {
    if (!supabase || !sessionUser) { toast.error("Sign in to cloud first."); return; }
    const key = ref.current.currentShopPreset;
    const localRevision = ref.current.revision;
    try { requirePermission("canManageSettings"); const { data, error } = await supabase.from("paddl_backups").select("revision,payload").eq("owner_id", sessionUser.id).eq("workspace", key).single(); if (error) throw error;
      assert(ref.current.currentShopPreset === key && ref.current.revision === localRevision, "Workspace changed while downloading. Try again."); validateBackup(data.payload);
      if (importDataJson(JSON.stringify(data.payload))) { cloudRevision.current = data.revision; cloudKey.current = sessionUser.id + ":" + key; syncedLocalRevision.current = ref.current.revision; setLastSyncedAt(now()); setSyncError(null); toast.success("Cloud backup restored. A recovery copy of this device was saved."); }
    } catch (e) { toast.error((e as Error).message); }
  };
  const setCart = (items: CartItem[] | ((previous: CartItem[]) => CartItem[])) => safely(s => { s.cart = typeof items === "function" ? items(s.cart) : items; });
  const holdCart = (name: string) => safely(s => { assert(s.cart.length, "Add items first."); s.heldCarts.unshift({ id: id("cart"), name: name.trim() || "Order " + (s.heldCarts.length + 1), items: s.cart, createdAt: now() }); s.cart = []; });
  const resumeCart = (cid: string) => safely(s => { assert(s.cart.length === 0, "Hold or clear the current cart first."); const held = s.heldCarts.find(c => c.id === cid); assert(held, "Held order not found."); s.cart = held.items; s.heldCarts = s.heldCarts.filter(c => c.id !== cid); });
  const pendingSyncCount = Math.max(0, state.revision - syncedLocalRevision.current);
  const syncStatus = !isOnline ? "offline" : isSyncing ? "syncing" : syncError ? "error" : lastSyncedAt && pendingSyncCount === 0 ? "synced" : "local";
  return { ...state, mounted, isOnline, isAuthenticated, isAuthLoading, isSyncing, syncStatus, syncError, lastSyncedAt, pendingSyncCount, isSupabaseActive: isSupabaseConfigured(), sessionUser,
    addProduct, updateProduct, deleteProduct, adjustProductStock, processCheckout, voidTransaction, processReturn, addCustomer, updateCustomer, recordDebtPayment, addManualDebt, addExpense, receiveStock, openCashDrawer, closeCashDrawer, logCashAdjustment,
    logAuditEvent, addStaff, updateStaff, deleteStaff, toggleStaffActive, switchStaff, hasPermission, verifyOwnerPin, updateSettings, setFontSizeMode: (fontSizeMode: "NORMAL" | "LARGE") => safely(s => { s.settings.fontSizeMode = fontSizeMode; }), toggleProductBestseller: (pid: string) => updateProduct(pid, { isBestseller: !ref.current.products.find(p => p.id === pid)?.isBestseller }),
    loginWithPin, loginWithEmail, registerStoreAccount, logout, quickDemoLogin, signInWithEmail: loginWithEmail, signOut: logout, loadShopPreset, syncCloud, restoreCloud, exportDataJson, importDataJson, resetToDemoData, setCart, holdCart, resumeCart };
}
const StoreContext = createContext<ReturnType<typeof useStoreState> | undefined>(undefined);
export function StoreProvider({ children }: { children: React.ReactNode }) { const store = useStoreState(); return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>; }
export function useStore() { const value = useContext(StoreContext); if (!value) throw new Error("useStore needs StoreProvider"); return value; }
