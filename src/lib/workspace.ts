export type AppMode = "DEMO" | "PRODUCTION";
export const appMode = (value: unknown): AppMode =>
  value === "PRODUCTION" ? "PRODUCTION" : "DEMO";
export const workspaceStorageKey = (
  industry: string,
  mode: AppMode = "DEMO",
) =>
  mode === "DEMO"
    ? "PADDL_WORKSPACE_V4_" + industry
    : "PADDL_PRODUCTION_V1_" + industry;
export const cloudWorkspaceKey = (industry: string, mode: AppMode = "DEMO") =>
  mode === "DEMO" ? industry : "PRODUCTION_" + industry;
import type { StoreSettings, StaffUser, CashDrawerShift } from "../types/index";

export function productionDefaults(
  settings: StoreSettings,
  sourceOwner: StaffUser,
) {
  const owner = {
    ...structuredClone(sourceOwner),
    id: "production-owner",
    name: "Business owner",
    email: "",
    pin: "",
    createdAt: new Date().toISOString(),
  };
  const cleanSettings: StoreSettings = {
    ...structuredClone(settings),
    storeName: "Your business",
    name: "Your business",
    tagline: "",
    address: "",
    phone: "",
    tinNumber: "",
    gcashNumber: "",
    mayaNumber: "",
    qrPhImageUrl: "",
    ownerPin: "",
    receiptFooterMessage: "Thank you for your purchase.",
    enableSoundEffects: false,
    taxEnabled: false,
  };
  const cashDrawer: CashDrawerShift = {
    id: "unopened",
    openedAt: "",
    openedBy: "",
    openingCash: 0,
    cashSales: 0,
    cashIn: 0,
    cashOut: 0,
    expectedCash: 0,
    status: "CLOSED",
  };
  return {
    appMode: "PRODUCTION" as const,
    products: [],
    customers: [],
    debtEntries: [],
    transactions: [],
    expenses: [],
    auditLogs: [],
    returnRecords: [],
    stockReceipts: [],
    shiftHistory: [],
    cart: [],
    heldCarts: [],
    staffList: [owner],
    currentStaff: owner,
    settings: cleanSettings,
    cashDrawer,
    revision: 0,
  };
}
