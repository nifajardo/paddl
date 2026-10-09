"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import type {
  Product,
  Customer,
  Expense,
  Transaction,
  StaffUser,
  UserRole,
  StoreSettings,
  CashDrawerShift,
  DebtEntry,
  AuditLogEntry,
  ReturnRecord,
  StaffPermissions,
  CartItem,
} from "@/types";
import { INITIAL_STAFF } from "@/data/mockData";
import { ALL_SHOP_PRESETS, type ShopPreset } from "@/data/shopPresets";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  assert,
  nonnegative,
  positive,
  validateProduct,
  validateCheckout,
  calculateReturn,
  money,
  businessDate,
  type CheckoutInput,
} from "@/lib/commerce";
import { toast } from "sonner";
import { reconcileCloud, cloudError, type CloudCheckpoint } from "@/lib/cloudSync";
import {
  appMode,
  workspaceStorageKey,
  cloudWorkspaceKey,
  productionDefaults,
  type AppMode,
} from "@/lib/workspace";

type PresetKey = ShopPreset["id"];
export interface StockReceipt {
  id: string;
  supplier: string;
  reference: string;
  date: string;
  total: number;
  lines: { productId: string; quantity: number; cost: number }[];
  paymentMethod: "CASH" | "GCASH" | "BANK";
}
export interface HeldCart {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: string;
}
interface StoreData {
  appMode?: AppMode;
  accountOwnerId?: string;
  cloudCheckpoint?: CloudCheckpoint;
  products: Product[];
  customers: Customer[];
  debtEntries: DebtEntry[];
  transactions: Transaction[];
  expenses: Expense[];
  cashDrawer: CashDrawerShift;
  settings: StoreSettings;
  staffList: StaffUser[];
  currentStaff: StaffUser;
  auditLogs: AuditLogEntry[];
  returnRecords: ReturnRecord[];
  stockReceipts: StockReceipt[];
  shiftHistory: CashDrawerShift[];
  cart: CartItem[];
  heldCarts: HeldCart[];
  revision: number;
  currentShopPreset: PresetKey;
}
const ACTIVE = "PADDLR_CURRENT_PRESET";
const MODE = "PADDL_APP_MODE";
const storageKey = (s: StoreData) =>
  workspaceStorageKey(s.currentShopPreset, appMode(s.appMode), s.accountOwnerId);
const id = (prefix: string) => prefix + "-" + crypto.randomUUID();
const now = () => new Date().toISOString();
function seed(key: PresetKey, mode: AppMode = "DEMO"): StoreData {
  const p = structuredClone(ALL_SHOP_PRESETS[key]);
  const data: StoreData = {
    appMode: mode,
    products: p.products,
    customers: p.customers,
    debtEntries: p.debtEntries,
    transactions: p.transactions,
    expenses: p.expenses,
    settings: p.settings,
    cashDrawer: p.cashDrawer,
    staffList: structuredClone(INITIAL_STAFF),
    currentStaff: structuredClone(INITIAL_STAFF[0]),
    auditLogs: [],
    returnRecords: [],
    stockReceipts: [],
    shiftHistory: [],
    cart: [],
    heldCarts: [],
    revision: 0,
    currentShopPreset: key,
  };
  if (mode === "PRODUCTION")
    return { ...data, ...productionDefaults(p.settings, data.staffList[0]) };
  return data;
}
function validateBackup(value: unknown): asserts value is StoreData {
  assert(value && typeof value === "object", "Invalid backup.");
  const s = value as StoreData;
  assert(
    s.appMode === undefined ||
      s.appMode === "DEMO" ||
      s.appMode === "PRODUCTION",
    "Invalid workspace mode.",
  );
  assert(
    s.currentShopPreset in ALL_SHOP_PRESETS,
    "Unknown industry in backup.",
  );
  for (const key of [
    "products",
    "customers",
    "transactions",
    "debtEntries",
    "expenses",
    "staffList",
    "auditLogs",
    "returnRecords",
    "cart",
    "heldCarts",
    "stockReceipts",
    "shiftHistory",
  ] as const)
    assert(Array.isArray(s[key]), "Backup is missing " + key);
  assert(
    s.settings?.storeName &&
      s.cashDrawer &&
      s.currentStaff?.id &&
      s.staffList.some((u) => u.role === "OWNER" && u.isActive),
    "Backup is missing store or owner details.",
  );
  assert(
    Number.isSafeInteger(s.revision) && s.revision >= 0,
    "Invalid backup revision.",
  );
  if (s.cloudCheckpoint) {
    assert(Number.isSafeInteger(s.cloudCheckpoint.revision) && s.cloudCheckpoint.revision > 0 &&
      Number.isSafeInteger(s.cloudCheckpoint.localRevision) && s.cloudCheckpoint.localRevision >= 0 &&
      s.cloudCheckpoint.localRevision <= s.revision && Number.isFinite(Date.parse(s.cloudCheckpoint.savedAt)),
      "Invalid cloud checkpoint.");
  }
  const ids = new Set<string>();
  s.products.forEach((p) => {
    assert(p.id && !ids.has(p.id), "Duplicate or missing product ID.");
    ids.add(p.id);
    validateProduct(p);
  });
  s.customers.forEach((c) => {
    assert(
      typeof c.name === "string" && typeof c.phone === "string",
      "Invalid customer.",
    );
    nonnegative(c.totalDebt, "Customer balance");
    nonnegative(c.creditLimit, "Credit limit");
  });
  s.transactions.forEach((t) => {
    assert(
      t.id &&
        Array.isArray(t.items) &&
        Number.isFinite(Date.parse(t.createdAt)),
      "Invalid sale.",
    );
    nonnegative(t.total, "Sale total");
    t.items.forEach((i) => {
      positive(i.quantity, "Sale quantity");
      nonnegative(i.subtotal, "Line subtotal");
      validateProduct(i.product);
    });
  });
  s.expenses.forEach((e) => positive(e.amount, "Expense"));
  s.debtEntries.forEach((e) => {
    nonnegative(e.amount, "Debt entry");
    nonnegative(e.balanceAfter, "Debt balance");
  });
  nonnegative(s.cashDrawer.openingCash, "Opening cash");
  assert(Number.isFinite(s.cashDrawer.expectedCash), "Invalid cash drawer.");
}
function useStoreState() {
  const readOnlyPreview = usePathname() === "/print";
  const [state, setState] = useState<StoreData>(() => seed("SARI_SARI", "PRODUCTION"));
  const ref = useRef(state);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isOnline, setOnline] = useState(true);
  const [isSyncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isSessionLoading, setSessionLoading] = useState(true);
  const [isWorkspaceLoading, setWorkspaceLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudRetry, setCloudRetry] = useState(0);
  const [isAuthLoading, setAuthLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const account = useRef<string | null>(null);
  const ownerLoginRequested = useRef(false);
  const cloudEpoch = useRef(0);
  const cloudBlocked = useRef(false);
  const pinAttempts = useRef({ count: 0, until: 0 });
  const cloudRevision = useRef<number | null>(null);
  const cloudKey = useRef<string | null>(null);
  const [syncedLocalRevision, setSyncedLocalRevision] = useState(-1);
  const syncing = useRef(false);
  const ownerApproval = useRef(0);
  function apply(s: StoreData) {
    ref.current = s;
    setState(s);
  }
  const sessionId = sessionUser?.id;
  const finishWorkspaceLoad = useEffectEvent((staff?: StaffUser) => {
    if (staff) startSession(staff);
    setWorkspaceLoading(false);
  });
  useEffect(() => {
    try {
      const selected = localStorage.getItem(ACTIVE) as PresetKey;
      const key = selected in ALL_SHOP_PRESETS ? selected : "SARI_SARI";
      const mode = appMode(localStorage.getItem(MODE) ?? "PRODUCTION");
      const saved = localStorage.getItem(workspaceStorageKey(key, mode));
      let initial = seed(key, mode);
      if (saved && mode === "DEMO") {
        const parsed = JSON.parse(saved);
        validateBackup(parsed);
        assert(
          appMode(parsed.appMode) === mode,
          "Saved workspace mode does not match.",
        );
        initial = parsed;
      } else {
        const legacy = localStorage.getItem("PEDDLR_PRO_STORE_V3");
        if (legacy && mode === "DEMO") {
          const migrated = {
            ...initial,
            ...JSON.parse(legacy),
            currentShopPreset: key,
            revision: 0,
          };
          validateBackup(migrated);
          initial = migrated;
        }
      }
      // Browser storage is an external source and can only be hydrated after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      apply(initial);
      const auth = JSON.parse(
        sessionStorage.getItem("PADDL_SESSION") || "null",
      );
      if (
        mode === "DEMO" && auth?.staffId &&
        appMode(auth.mode) === mode &&
        (!auth.industry || auth.industry === key) &&
        initial.staffList.some((s) => s.id === auth.staffId && s.isActive)
      ) {
        apply({
          ...initial,
          currentStaff: initial.staffList.find((s) => s.id === auth.staffId)!,
        });
        setAuthenticated(true);
      }
    } catch {
      toast.error(
        "Saved data could not be loaded. Your original backup has been preserved. Restore a valid backup in Settings.",
      );
    }
    setMounted(true);
    setOnline(navigator.onLine);
    const online = () => setOnline(true),
      offline = () => setOnline(false);
    const storage = (e: StorageEvent) => {
      if (e.key === storageKey(ref.current) && e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          validateBackup(next);
          if (next.revision > ref.current.revision)
            apply({ ...next, currentStaff: ref.current.currentStaff });
        } catch {
          /* Keep last known good state. */
        }
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("storage", storage);
    const auth = supabase?.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") {
        ownerLoginRequested.current = true;
        setPasswordRecovery(true);
        setAuthenticated(false);
        localStorage.setItem(MODE, "PRODUCTION");
        if (appMode(ref.current.appMode) !== "PRODUCTION") apply(seed(ref.current.currentShopPreset, "PRODUCTION"));
      }
      const nextAccount = session?.user.id || null;
      if (!nextAccount) ownerLoginRequested.current = false;
      if (account.current !== nextAccount) {
        account.current = nextAccount;
        cloudEpoch.current++;
        cloudRevision.current = null;
        cloudKey.current = null;
        setSyncedLocalRevision(-1);
        cloudBlocked.current = false;
        setCloudReady(false);
        setLastSyncedAt(null);
        setSyncError(null);
        ownerApproval.current = 0;
        if (appMode(ref.current.appMode) === "PRODUCTION") {
          setAuthenticated(false);
          sessionStorage.removeItem("PADDL_SESSION");
          apply(seed(ref.current.currentShopPreset, "PRODUCTION"));
        }
      }
      setSessionUser(session?.user || null);
      setSessionLoading(false);
    });
    if (!supabase) setSessionLoading(false);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("storage", storage);
      auth?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (readOnlyPreview || !mounted || isSessionLoading || appMode(state.appMode) !== "PRODUCTION" || !sessionId || !supabase) return;
    const client = supabase;
    const ownerId = sessionId;
    const industry = state.currentShopPreset;
    const workspace = cloudWorkspaceKey(industry, "PRODUCTION");
    const epoch = ++cloudEpoch.current;
    let cancelled = false;
    const valid = () => !cancelled && epoch === cloudEpoch.current && account.current === ownerId;
    // Lock this workspace while reconciling the external device and cloud records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspaceLoading(true);
    setCloudReady(false);
    cloudBlocked.current = false;
    setSyncError(null);
    let local: StoreData = { ...seed(industry, "PRODUCTION"), accountOwnerId: ownerId };
    try {
      const saved = localStorage.getItem(storageKey(local));
      if (saved) {
        const parsed = JSON.parse(saved);
        validateBackup(parsed);
        assert(parsed.accountOwnerId === ownerId && parsed.currentShopPreset === industry && appMode(parsed.appMode) === "PRODUCTION", "Saved account workspace does not match.");
        local = parsed;
      }
    } catch {
      cloudBlocked.current = true;
      setSyncError("Saved business data could not be loaded. Original data is preserved. Export it before recovery.");
      setWorkspaceLoading(false);
      return;
    }
    apply(local);
    const initialDisk = localStorage.getItem(storageKey(local));
    void (async () => {
      try {
        if (!navigator.onLine) throw new Error("Offline. Changes remain on this device and will save online when the connection returns.");
        const { data, error } = await client.from("paddl_backups")
          .select("revision,payload,updated_at").eq("owner_id", ownerId).eq("workspace", workspace).maybeSingle();
        if (!valid()) return;
        if (error) throw error;
        if (localStorage.getItem(storageKey(local)) !== initialDisk) {
          cloudBlocked.current = true;
          throw new Error("This business changed in another tab while loading. Refresh before continuing. Use one active register.");
        }
        const decision = reconcileCloud(local.revision, local.cloudCheckpoint, data?.revision ?? null);
        if (decision === "conflict") {
          cloudBlocked.current = true;
          throw new Error("Cloud and device records differ. Automatic saving is paused. Download this device's backup, then restore the cloud version in Settings.");
        }
        if (decision === "download" && data) {
          validateBackup(data.payload);
          assert(appMode(data.payload.appMode) === "PRODUCTION" && data.payload.currentShopPreset === industry, "Cloud workspace does not match.");
          localStorage.setItem("PADDL_RECOVERY_" + Date.now(), JSON.stringify(local));
          local = { ...data.payload, accountOwnerId: ownerId,
            cloudCheckpoint: { revision: data.revision, localRevision: data.payload.revision, savedAt: data.updated_at } };
          localStorage.setItem(storageKey(local), JSON.stringify(local));
          apply(local);
        }
        cloudKey.current = ownerId + ":" + workspace;
        cloudRevision.current = data?.revision ?? 0;
        setSyncedLocalRevision(local.cloudCheckpoint?.localRevision ?? -1);
        setLastSyncedAt(local.cloudCheckpoint?.savedAt ?? null);
        setCloudReady(true);
      } catch (e) {
        if (valid()) setSyncError(cloudError(e as Error));
      } finally {
        if (valid()) {
          const owner = local.staffList.find((staff) => staff.role === "OWNER" && staff.isActive && staff.pin);
          let staff: StaffUser | undefined = ownerLoginRequested.current ? owner : undefined;
          if (owner) {
            const savedSession = sessionStorage.getItem("PADDL_SESSION");
            try {
              const parsed = JSON.parse(savedSession || "null");
              if (parsed?.ownerId === ownerId && parsed.industry === industry && parsed.mode === "PRODUCTION")
                staff = local.staffList.find((s) => s.id === parsed.staffId && s.isActive);
            } catch { /* A corrupt staff session never changes the business data. */ }
          }
          ownerLoginRequested.current = false;
          finishWorkspaceLoad(staff);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [readOnlyPreview, mounted, isSessionLoading, sessionId, state.currentShopPreset, state.appMode, isOnline, cloudRetry]);
  function commit<T>(operation: (draft: StoreData) => T): T {
    assert(mounted, "Store is still loading.");
    assert(!readOnlyPreview, "Print previews cannot change business records.");
    const s = ref.current;
    if (appMode(s.appMode) === "PRODUCTION")
      assert(account.current && s.accountOwnerId === account.current && !isWorkspaceLoading,
        "Sign in to your business account and wait for its workspace to load.");
    const disk = localStorage.getItem(storageKey(s));
    if (disk) {
      const latest = JSON.parse(disk);
      validateBackup(latest);
      assert(latest.accountOwnerId === s.accountOwnerId, "Saved business account does not match.");
      if (latest.revision > s.revision) {
        validateBackup(latest);
        apply({ ...latest, currentStaff: s.currentStaff });
        throw new Error(
          "This store changed in another tab. Review the refreshed data and try again.",
        );
      }
    }
    const next = structuredClone(s);
    const result = operation(next);
    next.revision++;
    try {
      localStorage.setItem(storageKey(next), JSON.stringify(next));
    } catch {
      throw new Error(
        "Could not save on this device. Free browser storage or export a backup before continuing.",
      );
    }
    apply(next);
    return result;
  }
  function safely(operation: (draft: StoreData) => void) {
    try {
      commit(operation);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save.");
      return false;
    }
  }
  function audit(
    s: StoreData,
    action: AuditLogEntry["action"],
    description: string,
  ) {
    s.auditLogs.unshift({
      id: id("audit"),
      action,
      description,
      performedBy: s.currentStaff.name,
      staffName: s.currentStaff.name,
      staffRole: s.currentStaff.role,
      createdAt: now(),
    });
  }
  function hasPermission(permission: keyof StaffPermissions) {
    if (appMode(ref.current.appMode) === "PRODUCTION" &&
      (!isAuthenticated || !account.current || ref.current.accountOwnerId !== account.current)) return false;
    const staff = ref.current.currentStaff;
    if (!staff.isActive) return false;
    if (staff.role === "OWNER") return true;
    const aliases: Partial<
      Record<keyof StaffPermissions, keyof StaffPermissions>
    > = {
      canViewReports: "canViewFinancialReports",
      canManageSettings: "canModifySettings",
      canManageUsers: "canManageStaff",
    };
    const explicit =
      staff.permissions?.[permission] ??
      staff.permissions?.[aliases[permission] as keyof StaffPermissions];
    if (explicit !== undefined) return explicit;
    if (staff.role === "MANAGER")
      return ![
        "canManageSettings",
        "canModifySettings",
        "canManageUsers",
        "canManageStaff",
      ].includes(permission);
    return staff.role === "CASHIER"
      ? permission === "canProcessSales"
      : permission === "canManageInventory";
  }
  function requirePermission(permission: keyof StaffPermissions) {
    assert(
      hasPermission(permission) || Date.now() < ownerApproval.current,
      "Owner approval is required for this action.",
    );
  }
  const logAuditEvent = (entry: Omit<AuditLogEntry, "id" | "createdAt">) =>
    safely((s) => {
      s.auditLogs.unshift({ ...entry, id: id("audit"), createdAt: now() });
    });
  const addProduct = (data: Omit<Product, "id" | "createdAt" | "updatedAt">) =>
    commit((s) => {
      requirePermission("canManageInventory");
      const p = { ...data, id: id("prod"), createdAt: now(), updatedAt: now() };
      validateProduct(p);
      assert(
        !p.barcode || !s.products.some((x) => x.barcode === p.barcode),
        "Barcode already belongs to another product.",
      );
      s.products.unshift(p);
      audit(s, "PRODUCT_CREATED", "Added " + p.name);
      return p;
    });
  const updateProduct = (pid: string, updates: Partial<Product>) =>
    safely((s) => {
      requirePermission("canManageInventory");
      const index = s.products.findIndex((p) => p.id === pid);
      assert(index >= 0, "Product not found.");
      const p = { ...s.products[index], ...updates, id: pid, updatedAt: now() };
      validateProduct(p);
      assert(
        !p.barcode ||
          !s.products.some((x) => x.id !== pid && x.barcode === p.barcode),
        "Barcode already in use.",
      );
      s.products[index] = p;
      audit(s, "PRODUCT_UPDATED", "Updated " + p.name);
    });
  const deleteProduct = (pid: string) =>
    updateProduct(pid, { isActive: false });
  const adjustProductStock = (pid: string, delta: number, reason: string) =>
    safely((s) => {
      requirePermission("canManageInventory");
      const p = s.products.find((p) => p.id === pid);
      assert(p, "Product not found.");
      assert(reason.trim(), "Enter a stock adjustment reason.");
      nonnegative(p.stock + delta, "Resulting stock");
      p.stock = money(p.stock + delta);
      p.updatedAt = now();
      audit(s, "STOCK_ADJUSTED", p.name + ": " + delta + " (" + reason + ")");
    });
  const processCheckout = (data: CheckoutInput): Transaction =>
    commit((s) => {
      if (data.requestId) {
        const existing = s.transactions.find(
          (t) => t.requestId === data.requestId,
        );
        if (existing) return existing;
      }
      requirePermission("canProcessSales");
      const checked = validateCheckout(data, s.products, s.customers);
      if (checked.cashReceived > 0 && !data.isBackdated)
        assert(
          s.cashDrawer.status === "OPEN",
          "Open a cash shift before accepting cash.",
        );
      const txn: Transaction = {
        ...data,
        ...checked,
        id: id("txn"),
        receiptNumber:
          "PD-" +
          businessDate().replaceAll("-", "") +
          "-" +
          crypto.randomUUID().slice(0, 8).toUpperCase(),
        status: "COMPLETED",
        cashierName: s.currentStaff.name,
        createdAt: data.customDate || now(),
        amountTendered:
          data.paymentMethod === "CREDIT_UTANG" ? 0 : data.amountTendered,
      };
      if (txn.splitDetail)
        txn.splitDetail = {
          ...txn.splitDetail,
          cashAmount: checked.cashReceived,
        };
      checked.items.forEach((item) => {
        const p = s.products.find((p) => p.id === item.product.id)!;
        p.stock = money(p.stock - item.quantity);
        p.updatedAt = now();
      });
      if (txn.paymentMethod === "CREDIT_UTANG") {
        const c = s.customers.find((c) => c.id === txn.customerId)!;
        c.totalDebt = money(c.totalDebt + txn.total);
        txn.customerName = c.name;
        s.debtEntries.unshift({
          id: id("debt"),
          customerId: c.id,
          customerName: c.name,
          transactionId: txn.id,
          type: "DEBT_INCREASE",
          amount: txn.total,
          balanceAfter: c.totalDebt,
          notes: txn.receiptNumber,
          date: txn.createdAt,
          recordedBy: s.currentStaff.name,
        });
      }
      if (!data.isBackdated) {
        s.cashDrawer.cashSales = money(
          s.cashDrawer.cashSales + checked.cashReceived,
        );
        s.cashDrawer.expectedCash = money(
          s.cashDrawer.expectedCash + checked.cashReceived,
        );
      }
      s.transactions.unshift(txn);
      s.cart = [];
      audit(
        s,
        "SALE_CREATED",
        txn.receiptNumber +
          ": ₱" +
          txn.total.toFixed(2) +
          " via " +
          txn.paymentMethod,
      );
      return txn;
    });
  function reversePayment(s: StoreData, txn: Transaction, amount: number) {
    if (txn.paymentMethod === "CREDIT_UTANG") {
      const c = s.customers.find((c) => c.id === txn.customerId);
      assert(c, "Customer no longer exists.");
      assert(
        c.totalDebt >= amount,
        "This credit has already been repaid. Reconcile the customer's repayment before reversing the sale.",
      );
      c.totalDebt = money(c.totalDebt - amount);
      s.debtEntries.unshift({
        id: id("debt"),
        customerId: c.id,
        customerName: c.name,
        transactionId: txn.id,
        type: "DEBT_ADJUSTMENT",
        amount,
        balanceAfter: c.totalDebt,
        notes: "Sale reversal: " + txn.receiptNumber,
        date: now(),
        recordedBy: s.currentStaff.name,
      });
    }
    const previous = txn.refundedAmount || 0;
    const cash =
      txn.paymentMethod === "CASH"
        ? amount
        : txn.paymentMethod === "SPLIT"
          ? money(
              money(
                ((previous + amount) * (txn.splitDetail?.cashAmount || 0)) /
                  (txn.total || 1),
              ) -
                money(
                  (previous * (txn.splitDetail?.cashAmount || 0)) /
                    (txn.total || 1),
                ),
            )
          : 0;
    if (cash > 0) {
      assert(
        s.cashDrawer.status === "OPEN",
        "Open a cash shift to issue the cash refund.",
      );
      s.cashDrawer.cashOut = money(s.cashDrawer.cashOut + cash);
      s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash - cash);
    }
  }
  const voidTransaction = (params: {
    transactionId: string;
    reason: string;
    notes?: string;
  }) => {
    try {
      commit((s) => {
        requirePermission("canVoidTransactions");
        const t = s.transactions.find((t) => t.id === params.transactionId);
        assert(t, "Sale not found.");
        assert(
          t.status === "COMPLETED",
          "Only an unreturned, completed sale can be voided.",
        );
        assert(params.reason.trim(), "Enter a reason.");
        reversePayment(s, t, t.total);
        t.items.forEach((i) => {
          const p = s.products.find((p) => p.id === i.product.id);
          if (p) p.stock = money(p.stock + i.quantity);
        });
        t.status = "VOIDED";
        t.voidReason = params.reason;
        t.voidNotes = params.notes;
        t.voidedAt = now();
        t.voidedBy = s.currentStaff.name;
        audit(s, "SALE_VOIDED", t.receiptNumber + ": " + params.reason);
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };
  const processReturn = (params: {
    transactionId: string;
    returnedItems: { productId: string; quantity: number }[];
    reason: string;
    notes?: string;
    restock?: boolean;
  }) => {
    try {
      const returnRecord = commit((s) => {
        requirePermission("canProcessReturns");
        const t = s.transactions.find((t) => t.id === params.transactionId);
        assert(t, "Sale not found.");
        assert(params.reason.trim(), "Enter a return reason.");
        const returnedItems = calculateReturn(t, params.returnedItems);
        const totalRefundAmount = money(
          returnedItems.reduce((a, i) => a + i.refundAmount, 0),
        );
        reversePayment(s, t, totalRefundAmount);
        const record: ReturnRecord = {
          id: id("return"),
          transactionId: t.id,
          receiptNumber: t.receiptNumber,
          returnedItems,
          totalRefundAmount,
          restocked: params.restock !== false,
          reason: params.reason,
          notes: params.notes,
          processedBy: s.currentStaff.name,
          createdAt: now(),
        };
        if (record.restocked)
          returnedItems.forEach((i) => {
            const p = s.products.find((p) => p.id === i.productId);
            if (p) p.stock = money(p.stock + i.quantity);
          });
        t.returnHistory = [...(t.returnHistory || []), record];
        t.refundedAmount = money((t.refundedAmount || 0) + totalRefundAmount);
        t.status = t.items.every(
          (i) =>
            t
              .returnHistory!.flatMap((r) => r.returnedItems)
              .filter((r) => r.productId === i.product.id)
              .reduce((a, r) => a + r.quantity, 0) >= i.quantity,
        )
          ? "REFUNDED"
          : "PARTIALLY_RETURNED";
        s.returnRecords.unshift(record);
        audit(
          s,
          "ITEM_RETURNED",
          t.receiptNumber +
            ": refunded ₱" +
            totalRefundAmount.toFixed(2) +
            ". " +
            params.reason,
        );
        return record;
      });
      return { success: true, returnRecord };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };
  const addCustomer = (
    data: Omit<Customer, "id" | "createdAt" | "totalDebt">,
  ) =>
    commit((s) => {
      requirePermission("canProcessSales");
      assert(data.name.trim(), "Enter a customer name.");
      nonnegative(data.creditLimit, "Credit limit");
      const c = { ...data, id: id("customer"), totalDebt: 0, createdAt: now() };
      s.customers.unshift(c);
      return c;
    });
  const updateCustomer = (cid: string, updates: Partial<Customer>) =>
    safely((s) => {
      requirePermission("canProcessSales");
      const c = s.customers.find((c) => c.id === cid);
      assert(c, "Customer not found.");
      Object.assign(c, updates, { id: cid, totalDebt: c.totalDebt });
      nonnegative(c.creditLimit, "Credit limit");
    });
  const changeDebt = (
    cid: string,
    amount: number,
    payment: boolean,
    method: "CASH" | "GCASH",
    notes = "",
  ) =>
    commit((s) => {
      requirePermission("canProcessSales");
      positive(amount, "Amount");
      const c = s.customers.find((c) => c.id === cid);
      assert(c, "Customer not found.");
      assert(
        payment
          ? amount <= c.totalDebt
          : money(c.totalDebt + amount) <= c.creditLimit,
        payment
          ? "Payment exceeds the outstanding balance."
          : "Customer credit limit exceeded.",
      );
      if (payment && method === "CASH") {
        assert(
          s.cashDrawer.status === "OPEN",
          "Open a cash shift before collecting cash.",
        );
        s.cashDrawer.cashIn = money(s.cashDrawer.cashIn + amount);
        s.cashDrawer.expectedCash = money(s.cashDrawer.expectedCash + amount);
      }
      c.totalDebt = money(c.totalDebt + (payment ? -amount : amount));
      s.debtEntries.unshift({
        id: id("debt"),
        customerId: cid,
        customerName: c.name,
        type: payment ? "PAYMENT_RECEIVED" : "DEBT_INCREASE",
        amount,
        balanceAfter: c.totalDebt,
        notes: notes || (payment ? "Payment via " + method : "Manual credit"),
        date: now(),
        recordedBy: s.currentStaff.name,
      });
      audit(
        s,
        "SETTINGS_CHANGED",
        c.name +
          ": " +
          (payment ? "payment" : "credit") +
          " ₱" +
          amount.toFixed(2),
      );
    });
  const recordDebtPayment = (
    cid: string,
    amount: number,
    method: "CASH" | "GCASH",
    notes?: string,
  ) => changeDebt(cid, amount, true, method, notes);
  const addManualDebt = (cid: string, amount: number, notes: string) =>
    changeDebt(cid, amount, false, "CASH", notes);
  function expense(
    s: StoreData,
    data: Omit<Expense, "id" | "date" | "recordedBy">,
  ) {
    positive(data.amount, "Expense");
    assert(data.description.trim(), "Describe the expense.");
    if (data.paymentMethod === "CASH") {
      assert(
        s.cashDrawer.status === "OPEN",
        "Open a cash shift before recording a cash expense.",
      );
      s.cashDrawer.cashOut = money(s.cashDrawer.cashOut + data.amount);
      s.cashDrawer.expectedCash = money(
        s.cashDrawer.expectedCash - data.amount,
      );
    }
    const e = {
      ...data,
      id: id("expense"),
      date: now(),
      recordedBy: s.currentStaff.name,
    };
    s.expenses.unshift(e);
    return e;
  }
  const addExpense = (data: Omit<Expense, "id" | "date" | "recordedBy">) =>
    commit((s) => {
      requirePermission("canProcessSales");
      const e = expense(s, data);
      audit(
        s,
        "SETTINGS_CHANGED",
        "Expense: " + e.description + " ₱" + e.amount,
      );
      return e;
    });
  const receiveStock = (data: Omit<StockReceipt, "id" | "date" | "total">) =>
    commit((s) => {
      requirePermission("canManageInventory");
      assert(
        data.supplier.trim() && data.lines.length,
        "Enter a supplier and at least one item.",
      );
      const seen = new Set<string>();
      let total = 0;
      data.lines.forEach((line) => {
        assert(!seen.has(line.productId), "Duplicate receiving line.");
        seen.add(line.productId);
        positive(line.quantity, "Quantity");
        nonnegative(line.cost, "Unit cost");
        const p = s.products.find((p) => p.id === line.productId);
        assert(p?.isActive, "Product no longer available.");
        p.costPrice = money(
          (p.stock * p.costPrice + line.quantity * line.cost) /
            (p.stock + line.quantity),
        );
        p.stock = money(p.stock + line.quantity);
        p.updatedAt = now();
        total = money(total + line.quantity * line.cost);
      });
      const receipt = { ...data, id: id("purchase"), date: now(), total };
      s.stockReceipts.unshift(receipt);
      if (total > 0)
        expense(s, {
          category: "Supplier & Stock Restock",
          amount: total,
          description: "Stock received from " + data.supplier,
          paymentMethod: data.paymentMethod,
          receiptRef: data.reference,
        });
      audit(
        s,
        "STOCK_ADJUSTED",
        "Received " +
          data.lines.length +
          " products from " +
          data.supplier +
          ": ₱" +
          total,
      );
      return receipt;
    });
  const openCashDrawer = (openingAmount: number, notes?: string) =>
    safely((s) => {
      requirePermission("canProcessSales");
      assert(s.cashDrawer.status === "CLOSED", "A shift is already open.");
      nonnegative(openingAmount, "Opening float");
      s.cashDrawer = {
        id: id("shift"),
        openedAt: now(),
        openedBy: s.currentStaff.name,
        openingCash: openingAmount,
        startingFloat: openingAmount,
        cashSales: 0,
        cashIn: 0,
        cashOut: 0,
        expectedCash: openingAmount,
        status: "OPEN",
        notes,
      };
      audit(s, "SETTINGS_CHANGED", "Opened shift with ₱" + openingAmount);
    });
  const closeCashDrawer = (actualCash: number, notes?: string) =>
    safely((s) => {
      requirePermission("canProcessSales");
      assert(s.cashDrawer.status === "OPEN", "Shift is already closed.");
      nonnegative(actualCash, "Counted cash");
      Object.assign(s.cashDrawer, {
        status: "CLOSED",
        closedAt: now(),
        closedBy: s.currentStaff.name,
        actualCash,
        discrepancy: money(actualCash - s.cashDrawer.expectedCash),
        notes,
      });
      s.shiftHistory.unshift({ ...s.cashDrawer });
      audit(
        s,
        "SETTINGS_CHANGED",
        "Closed shift; variance ₱" + s.cashDrawer.discrepancy,
      );
    });
  const logCashAdjustment = (
    amount: number,
    type: "IN" | "OUT",
    reason: string,
  ) =>
    safely((s) => {
      requirePermission("canProcessSales");
      assert(s.cashDrawer.status === "OPEN", "Open a shift first.");
      positive(amount, "Amount");
      assert(reason.trim(), "Enter a reason.");
      s.cashDrawer[type === "IN" ? "cashIn" : "cashOut"] += amount;
      s.cashDrawer.expectedCash = money(
        s.cashDrawer.expectedCash + (type === "IN" ? amount : -amount),
      );
      audit(
        s,
        "SETTINGS_CHANGED",
        "Cash " + type + ": ₱" + amount + ". " + reason,
      );
    });
  const updateSettings = (updates: Partial<StoreSettings>) =>
    safely((s) => {
      requirePermission("canManageSettings");
      if (updates.ownerPin !== undefined)
        assert(
          /^\d{4,6}$/.test(updates.ownerPin),
          "Use a PIN of 4 to 6 digits.",
        );
      Object.assign(s.settings, updates);
      audit(s, "SETTINGS_CHANGED", "Store settings updated");
    });
  const verifyOwnerPin = (pin: string) => {
    const owner = ref.current.staffList.find(
      (s) => s.role === "OWNER" && s.isActive,
    );
    const valid =
      !!owner &&
      !!pin.trim() &&
      pin.trim() === (ref.current.settings.ownerPin || owner.pin);
    if (valid) ownerApproval.current = Date.now() + 60_000;
    return valid;
  };
  const addStaff = (data: Omit<StaffUser, "id" | "createdAt">) =>
    commit((s) => {
      requirePermission("canManageUsers");
      assert(/^\d{4,6}$/.test(data.pin), "Use a PIN of 4 to 6 digits.");
      const staff = { ...data, id: id("staff"), createdAt: now() };
      s.staffList.push(staff);
      audit(s, "USER_CREATED", "Added " + staff.name);
      return staff;
    });
  const updateStaff = (sid: string, updates: Partial<StaffUser>) =>
    safely((s) => {
      requirePermission("canManageUsers");
      const staff = s.staffList.find((u) => u.id === sid);
      assert(staff, "Staff not found.");
      if (updates.pin !== undefined)
        assert(/^\d{4,6}$/.test(updates.pin), "Use a PIN of 4 to 6 digits.");
      Object.assign(staff, updates, { id: sid });
      assert(
        s.staffList.some((u) => u.isActive && u.role === "OWNER"),
        "Keep at least one active owner.",
      );
      if (staff.id === s.currentStaff.id) s.currentStaff = { ...staff };
      audit(s, "USER_UPDATED", "Updated " + staff.name);
    });
  const deleteStaff = (sid: string) => updateStaff(sid, { isActive: false });
  const toggleStaffActive = (sid: string) =>
    updateStaff(sid, {
      isActive: !ref.current.staffList.find((s) => s.id === sid)?.isActive,
    });
  function startSession(staff: StaffUser) {
    ownerApproval.current = 0;
    apply({ ...ref.current, currentStaff: staff });
    sessionStorage.setItem(
      "PADDL_SESSION",
      JSON.stringify({
        staffId: staff.id,
        mode: appMode(ref.current.appMode),
        industry: ref.current.currentShopPreset,
        ownerId: ref.current.accountOwnerId,
      }),
    );
    setAuthenticated(true);
  }
  const loginWithPin = (sid: string, pin: string) => {
    if (appMode(ref.current.appMode) === "PRODUCTION" &&
      (!account.current || ref.current.accountOwnerId !== account.current))
      return { success: false, error: "Sign in to the business account first." };
    if (Date.now() < pinAttempts.current.until)
      return { success: false, error: "Too many attempts. Wait one minute and try again." };
    const staff = ref.current.staffList.find((s) => s.id === sid && s.isActive);
    if (!pin.trim() || !staff || staff.pin !== pin.trim()) {
      pinAttempts.current.count++;
      if (pinAttempts.current.count >= 5) {
        pinAttempts.current = { count: 0, until: Date.now() + 60_000 };
      }
      return {
        success: false,
        error: "Incorrect PIN or inactive staff account.",
      };
    }
    pinAttempts.current = { count: 0, until: 0 };
    startSession(staff);
    return { success: true };
  };
  const switchStaff = (sid: string) => {
    if (!ref.current.staffList.some((staff) => staff.id === sid && staff.isActive)) {
      toast.error("Choose an active staff member.");
      return;
    }
    toast.info("Use Switch staff and enter that staff member's PIN.");
  };
  const quickDemoLogin = (role: UserRole) => {
    if (appMode(ref.current.appMode) !== "DEMO") return;
    const staff = ref.current.staffList.find(
      (s) => s.role === role && s.isActive,
    );
    if (staff) startSession(staff);
  };
  const loginWithEmail = async (email: string, password: string) => {
    if (!supabase)
      return { error: "Business sign-in needs Supabase configuration. You can still explore Demo Mode." };
    setAuthLoading(true);
    try {
      ownerLoginRequested.current = true;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setSessionUser(data.user);
      return {};
    } catch (e) {
      ownerLoginRequested.current = false;
      return { error: (e as Error).message };
    } finally {
      setAuthLoading(false);
    }
  };
  const registerStoreAccount = async (
    email: string,
    password: string,
    storeName?: string,
  ) => {
    if (!supabase) return { error: "Cloud is not configured." };
    setAuthLoading(true);
    try {
      if (password.length < 12) return { error: "Use a password of at least 12 characters." };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { store_name: storeName }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      return { success: true, needsConfirmation: !data.session };
    } catch (e) {
      return { error: (e as Error).message };
    } finally {
      setAuthLoading(false);
    }
  };
  const logout = async () => {
    if (syncing.current) {
      toast.info("Wait for the current cloud save to finish before signing out.");
      return;
    }
    const pending = appMode(ref.current.appMode) === "PRODUCTION" && ref.current.revision > 0 &&
      ref.current.cloudCheckpoint?.localRevision !== ref.current.revision;
    const result = await supabase?.auth.signOut({ scope: "local" });
    if (result?.error) { toast.error(result.error.message); return; }
    setSessionUser(null);
    setAuthenticated(false);
    sessionStorage.removeItem("PADDL_SESSION");
    ownerApproval.current = 0;
    if (pending) toast.info("Some changes are saved only on this device. Sign back in here to finish saving them online.");
  };
  const loadShopPreset = (key: PresetKey) => {
    try {
      assert(
        !syncing.current,
        "Wait for the cloud backup to finish before switching workspaces.",
      );
      assert(key in ALL_SHOP_PRESETS, "Unknown industry.");
      assert(
        appMode(ref.current.appMode) === "DEMO",
        "Industry demos are available in Demo Mode.",
      );
      localStorage.setItem(
        storageKey(ref.current),
        JSON.stringify(ref.current),
      );
      const saved = localStorage.getItem(workspaceStorageKey(key, "DEMO"));
      const next = saved ? JSON.parse(saved) : seed(key);
      validateBackup(next);
      assert(appMode(next.appMode) === "DEMO", "This is not a demo workspace.");
      localStorage.setItem(ACTIVE, key);
      apply(next);
      cloudRevision.current = null;
      cloudKey.current = null;
      setSyncedLocalRevision(-1);
      setLastSyncedAt(null);
      setSyncError(null);
      ownerApproval.current = 0;
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const switchAppMode = (
    mode: AppMode,
    industry: PresetKey = ref.current.currentShopPreset,
  ) => {
    try {
      if (mode === appMode(ref.current.appMode) && industry === ref.current.currentShopPreset) return true;
      assert(
        !syncing.current,
        "Wait for the cloud backup to finish before switching modes.",
      );
      if (isAuthenticated) requirePermission("canManageSettings");
      assert(industry in ALL_SHOP_PRESETS, "Choose a valid industry.");
      const current = ref.current;
      const saved = mode === "DEMO" ? localStorage.getItem(workspaceStorageKey(industry, mode)) : null;
      const next = saved ? JSON.parse(saved) : seed(industry, mode);
      validateBackup(next);
      assert(appMode(next.appMode) === mode, "Workspace mode does not match.");
      const disk = localStorage.getItem(storageKey(current));
      if (disk && (appMode(current.appMode) === "DEMO" || current.accountOwnerId)) {
        const latest = JSON.parse(disk);
        validateBackup(latest);
        assert(
          latest.revision <= current.revision,
          "This workspace changed in another tab. Refresh before switching modes.",
        );
      }
      if (appMode(current.appMode) === "DEMO" || current.accountOwnerId)
        localStorage.setItem(storageKey(current), JSON.stringify(current));
      if (mode === "DEMO") localStorage.setItem(storageKey(next), JSON.stringify(next));
      localStorage.setItem(ACTIVE, industry);
      localStorage.setItem(MODE, mode);
      sessionStorage.removeItem("PADDL_SESSION");
      setAuthenticated(false);
      ownerApproval.current = 0;
      cloudRevision.current = null;
      cloudKey.current = null;
      setSyncedLocalRevision(-1);
      cloudEpoch.current++;
      cloudBlocked.current = false;
      setCloudReady(false);
      setLastSyncedAt(null);
      setSyncError(null);
      apply(next);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const setupProduction = (details: {
    storeName: string;
    ownerName: string;
    pin: string;
    address: string;
    phone: string;
  }) => {
    try {
      assert(
        appMode(ref.current.appMode) === "PRODUCTION",
        "Switch to Production Mode first.",
      );
      assert(account.current && ref.current.accountOwnerId === account.current,
        "Sign in to your business account before setup.");
      assert(
        !ref.current.staffList.some(
          (staff) => staff.role === "OWNER" && staff.pin,
        ),
        "This business is already set up. Sign in with your owner PIN.",
      );
      assert(!cloudBlocked.current, "Resolve the cloud conflict before creating a business.");
      assert(
        details.storeName.trim() && details.ownerName.trim(),
        "Enter your business and owner names.",
      );
      assert(/^\d{6}$/.test(details.pin), "Choose a six-digit owner PIN.");
      const staff = commit((s) => {
        s.settings = {
          ...s.settings,
          storeName: details.storeName.trim(),
          name: details.storeName.trim(),
          address: details.address.trim(),
          phone: details.phone.trim(),
          ownerPin: details.pin,
        };
        const owner = {
          ...s.staffList[0],
          name: details.ownerName.trim(),
          pin: details.pin,
        };
        s.staffList = [owner];
        s.currentStaff = owner;
        audit(s, "SETTINGS_CHANGED", "Production business setup completed");
        return owner;
      });
      startSession(staff);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const exportDataJson = () =>
    JSON.stringify(
      { ...ref.current, schemaVersion: 4, exportedAt: now() },
      null,
      2,
    );
  const importDataJson = (json: string) => {
    try {
      requirePermission("canManageSettings");
      const disk = localStorage.getItem(storageKey(ref.current));
      if (disk) {
        const latest = JSON.parse(disk);
        validateBackup(latest);
        assert(latest.revision <= ref.current.revision, "Another tab changed this business. Refresh before restoring.");
      }
      const data = JSON.parse(json);
      validateBackup(data);
      assert(
        appMode(data.appMode) === appMode(ref.current.appMode),
        "This backup belongs to a different mode. Switch modes before restoring it.",
      );
      assert(
        data.currentShopPreset === ref.current.currentShopPreset,
        "Switch to the backup's industry before restoring.",
      );
      localStorage.setItem(
        "PADDL_RECOVERY_" + Date.now(),
        localStorage.getItem(storageKey(ref.current)) ||
          JSON.stringify(ref.current),
      );
      data.revision = ref.current.revision + 1;
      data.accountOwnerId = ref.current.accountOwnerId;
      data.cloudCheckpoint = ref.current.cloudCheckpoint;
      localStorage.setItem(storageKey(data), JSON.stringify(data));
      apply(data);
      ownerApproval.current = 0;
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const resetToDemoData = () => {
    try {
      requirePermission("canManageSettings");
      assert(
        appMode(ref.current.appMode) === "DEMO",
        "Demo reset is unavailable in Production Mode.",
      );
      localStorage.setItem(
        "PADDL_RECOVERY_" + Date.now(),
        JSON.stringify(ref.current),
      );
      const next = seed(ref.current.currentShopPreset);
      next.revision = ref.current.revision + 1;
      localStorage.setItem(storageKey(next), JSON.stringify(next));
      apply(next);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const syncCloud = async (automatic = false) => {
    if (readOnlyPreview) return;
    if (syncing.current) return;
    if (!supabase || !sessionUser) {
      if (!automatic) toast.info(
        "Saved on this device. Sign in to cloud in Settings to back it up.",
      );
      return;
    }
    if (!navigator.onLine) {
      if (!automatic) toast.info("You are offline. Changes remain saved on this device.");
      return;
    }
    const production = appMode(ref.current.appMode) === "PRODUCTION";
    if (production && !ref.current.staffList.some((s) => s.role === "OWNER" && s.pin)) return;
    if (production && (!cloudReady || cloudBlocked.current)) {
      if (!automatic && !cloudBlocked.current) setCloudRetry((n) => n + 1);
      return;
    }
    if (production && ref.current.cloudCheckpoint?.localRevision === ref.current.revision) return;
    syncing.current = true;
    setSyncing(true);
    setSyncError(null);
    const snapshot = structuredClone(ref.current);
    const workspace = cloudWorkspaceKey(
      snapshot.currentShopPreset,
      appMode(snapshot.appMode),
    );
    const key = sessionUser.id + ":" + workspace;
    const epoch = cloudEpoch.current;
    const valid = () => epoch === cloudEpoch.current && account.current === sessionUser.id &&
      cloudWorkspaceKey(ref.current.currentShopPreset, appMode(ref.current.appMode)) === workspace;
    try {
      if (cloudKey.current !== key) {
        const { data, error } = await supabase
          .from("paddl_backups")
          .select("revision")
          .eq("owner_id", sessionUser.id)
          .eq("workspace", workspace)
          .maybeSingle();
        if (error) throw error;
        if (!valid()) return;
        assert(
          !data,
          "A cloud backup already exists. Restore it in Settings before saving from this device to avoid overwriting another device's work.",
        );
        cloudRevision.current = 0;
        cloudKey.current = key;
      }
      const { data, error } = await supabase.rpc("save_paddl_backup", {
        p_workspace: workspace,
        p_expected_revision: cloudRevision.current,
        p_payload: snapshot,
      });
      if (error) throw error;
      if (!valid()) return;
      assert(Number.isSafeInteger(Number(data)) && Number(data) > 0, "Invalid cloud save revision.");
      cloudRevision.current = Number(data);
      setSyncedLocalRevision(snapshot.revision);
      const savedAt = now();
      setLastSyncedAt(savedAt);
      if (production) {
        const checkpoint = { revision: Number(data), localRevision: snapshot.revision, savedAt };
        const latest = ref.current;
        const disk = localStorage.getItem(storageKey(latest));
        const persisted = disk ? JSON.parse(disk) : latest;
        validateBackup(persisted);
        const next = { ...(persisted.revision > latest.revision ? persisted : latest), cloudCheckpoint: checkpoint };
        localStorage.setItem(storageKey(next), JSON.stringify(next));
        apply(next);
      }
      if (!automatic) toast.success("Cloud backup saved.");
    } catch (e) {
      if (valid()) {
        const message = cloudError(e as Error);
        if (/conflict|already exists/i.test(message)) cloudBlocked.current = true;
        setSyncError(message);
        if (!automatic) toast.error(message);
      }
    } finally {
      syncing.current = false;
      setSyncing(false);
    }
  };
  const autoSave = useEffectEvent(() => void syncCloud(true));
  useEffect(() => {
    if (readOnlyPreview || !mounted || appMode(state.appMode) !== "PRODUCTION" || !sessionId || !isOnline || cloudReady || isWorkspaceLoading || cloudBlocked.current || syncError?.startsWith("Cloud storage needs setup")) return;
    const retry = window.setInterval(() => setCloudRetry((n) => n + 1), 15_000);
    return () => window.clearInterval(retry);
  }, [readOnlyPreview, mounted, state.appMode, sessionId, isOnline, cloudReady, isWorkspaceLoading, syncError]);
  useEffect(() => {
    if (readOnlyPreview || !mounted || appMode(state.appMode) !== "PRODUCTION" || !sessionId || !isOnline || !cloudReady || isWorkspaceLoading) return;
    const timer = window.setTimeout(autoSave, 800);
    const retry = window.setInterval(autoSave, 15_000);
    const focus = () => {
      if (!syncing.current && !cloudBlocked.current) setCloudRetry((n) => n + 1);
    };
    window.addEventListener("focus", focus);
    return () => { window.clearTimeout(timer); window.clearInterval(retry); window.removeEventListener("focus", focus); };
  }, [readOnlyPreview, mounted, state.appMode, state.revision, sessionId, isOnline, cloudReady, isWorkspaceLoading]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (appMode(ref.current.appMode) === "PRODUCTION" && ref.current.revision > 0 &&
        ref.current.cloudCheckpoint?.localRevision !== ref.current.revision) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const restoreCloud = async () => {
    if (!supabase || !sessionUser) {
      toast.error("Sign in to cloud first.");
      return;
    }
    const key = ref.current.currentShopPreset;
    const mode = appMode(ref.current.appMode);
    const workspace = cloudWorkspaceKey(key, mode);
    const localRevision = ref.current.revision;
    if (syncing.current) return;
    syncing.current = true;
    setSyncing(true);
    const epoch = cloudEpoch.current;
    try {
      requirePermission("canManageSettings");
      const { data, error } = await supabase
        .from("paddl_backups")
        .select("revision,payload")
        .eq("owner_id", sessionUser.id)
        .eq("workspace", workspace)
        .single();
      if (error) throw error;
      assert(
        ref.current.currentShopPreset === key &&
          appMode(ref.current.appMode) === mode &&
          ref.current.revision === localRevision && epoch === cloudEpoch.current && account.current === sessionUser.id,
        "Workspace changed while downloading. Try again.",
      );
      validateBackup(data.payload);
      if (importDataJson(JSON.stringify(data.payload))) {
        cloudRevision.current = data.revision;
        cloudKey.current = sessionUser.id + ":" + workspace;
        setSyncedLocalRevision(ref.current.revision);
        const savedAt = now();
        if (mode === "PRODUCTION") {
          const next = { ...ref.current, cloudCheckpoint: { revision: data.revision, localRevision: ref.current.revision, savedAt } };
          localStorage.setItem(storageKey(next), JSON.stringify(next));
          apply(next);
          cloudBlocked.current = false;
          setCloudReady(true);
        }
        setLastSyncedAt(savedAt);
        setSyncError(null);
        toast.success(
          "Cloud backup restored. A recovery copy of this device was saved.",
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      syncing.current = false;
      setSyncing(false);
    }
  };
  const setCart = (
    items: CartItem[] | ((previous: CartItem[]) => CartItem[]),
  ) =>
    safely((s) => {
      s.cart = typeof items === "function" ? items(s.cart) : items;
    });
  const holdCart = (name: string) =>
    safely((s) => {
      assert(s.cart.length, "Add items first.");
      s.heldCarts.unshift({
        id: id("cart"),
        name: name.trim() || "Order " + (s.heldCarts.length + 1),
        items: s.cart,
        createdAt: now(),
      });
      s.cart = [];
    });
  const resumeCart = (cid: string) =>
    safely((s) => {
      assert(s.cart.length === 0, "Hold or clear the current cart first.");
      const held = s.heldCarts.find((c) => c.id === cid);
      assert(held, "Held order not found.");
      s.cart = held.items;
      s.heldCarts = s.heldCarts.filter((c) => c.id !== cid);
    });
  const pendingSyncCount = Math.max(
    0,
    state.revision - (state.cloudCheckpoint?.localRevision ?? syncedLocalRevision),
  );
  const syncStatus = !isOnline
    ? "offline"
    : isSyncing
      ? "syncing"
      : syncError
        ? "error"
        : lastSyncedAt && pendingSyncCount === 0
          ? "synced"
          : "local";
  return {
    ...state,
    appMode: appMode(state.appMode),
    productionNeedsSetup:
      appMode(state.appMode) === "PRODUCTION" &&
      !state.staffList.some((staff) => staff.role === "OWNER" && staff.pin),
    switchAppMode,
    setupProduction,
    mounted,
    isSessionLoading,
    isWorkspaceLoading,
    cloudReady,
    isOnline,
    isAuthenticated: isAuthenticated && (appMode(state.appMode) === "DEMO" ||
      (!!sessionUser && state.accountOwnerId === sessionUser.id)),
    isAuthLoading,
    passwordRecovery,
    finishPasswordRecovery: () => setPasswordRecovery(false),
    isSyncing,
    syncStatus,
    syncError,
    lastSyncedAt,
    pendingSyncCount,
    isSupabaseActive: isSupabaseConfigured(),
    sessionUser,
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
    receiveStock,
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
    setFontSizeMode: (fontSizeMode: "NORMAL" | "LARGE") =>
      safely((s) => {
        s.settings.fontSizeMode = fontSizeMode;
      }),
    toggleProductBestseller: (pid: string) =>
      updateProduct(pid, {
        isBestseller: !ref.current.products.find((p) => p.id === pid)
          ?.isBestseller,
      }),
    loginWithPin,
    loginWithEmail,
    registerStoreAccount,
    logout,
    quickDemoLogin,
    signInWithEmail: loginWithEmail,
    signOut: logout,
    loadShopPreset,
    syncCloud: () => syncCloud(false),
    restoreCloud,
    importLegacyProduction: () => {
      const saved = localStorage.getItem(workspaceStorageKey(ref.current.currentShopPreset, "PRODUCTION"));
      if (!saved) { toast.info("No earlier business data was found on this device."); return false; }
      return importDataJson(saved);
    },
    exportDataJson,
    importDataJson,
    resetToDemoData,
    setCart,
    holdCart,
    resumeCart,
  };
}
const StoreContext = createContext<
  ReturnType<typeof useStoreState> | undefined
>(undefined);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useStoreState();
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore needs StoreProvider");
  return value;
}
