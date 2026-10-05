export type UserRole = "OWNER" | "MANAGER" | "CASHIER";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin: string;
}

export type ProductCategory = 
  | "All" 
  | "Beverages" 
  | "Canned Goods & Instant" 
  | "Snacks & Sweets" 
  | "Rice & Grains" 
  | "Personal Care" 
  | "Household & Cleaning" 
  | "Cigarettes & Alcohol" 
  | "Services & E-Load";

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string; // pcs, pack, can, bottle, kg
  emoji: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customDiscount: number; // in PHP
  subtotal: number;
}

export type PaymentMethod = "CASH" | "GCASH" | "MAYA" | "CREDIT_UTANG" | "SPLIT";

export interface Transaction {
  id: string;
  receiptNumber: string;
  items: CartItem[];
  subtotal: number;
  discountType?: "NONE" | "SENIOR_PWD_20" | "CUSTOM";
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue: number;
  customerId?: string;
  customerName?: string;
  cashierName: string;
  status: "COMPLETED" | "REFUNDED" | "VOID";
  ewalletRefNumber?: string;
  isBackdated?: boolean;
  notes?: string;
  createdAt: string; // ISO date
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  creditLimit: number;
  totalDebt: number;
  notes?: string;
  createdAt: string;
}

export interface DebtEntry {
  id: string;
  customerId: string;
  customerName: string;
  transactionId?: string;
  type: "DEBT_INCREASE" | "PAYMENT_RECEIVED";
  amount: number;
  balanceAfter: number;
  notes?: string;
  date: string;
  recordedBy: string;
}

export type ExpenseCategory = 
  | "Rent" 
  | "Utilities & Power" 
  | "Supplier & Stock Restock" 
  | "Staff Wages" 
  | "Transportation & Gas" 
  | "Packaging & Supplies" 
  | "Repairs & Maintenance" 
  | "Personal Drawings" 
  | "Other Expenses";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  paymentMethod: "CASH" | "GCASH" | "BANK";
  receiptRef?: string;
  recordedBy: string;
}

export interface CashDrawerShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  openingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
  status: "OPEN" | "CLOSED";
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  tinNumber: string;
  receiptFooterMessage: string;
  taxEnabled: boolean;
  taxRate: number; // e.g. 12%
  currencySymbol: string;
  enableSoundEffects: boolean;
  lowStockAlertThreshold: number;
}
