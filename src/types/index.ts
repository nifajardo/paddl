export type UserRole = "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF";

export interface StaffPermissions {
  canProcessSales?: boolean;
  canManageInventory: boolean;
  canViewReports?: boolean;
  canViewFinancialReports?: boolean;
  canProcessReturns: boolean;
  canVoidTransactions: boolean;
  canManageSettings?: boolean;
  canModifySettings?: boolean;
  canManageUsers?: boolean;
  canManageStaff?: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin: string;
  isActive: boolean;
  permissions?: StaffPermissions;
  createdAt?: string;
}

export type ProductCategory = 
  | "All" 
  // Sari-Sari & Grocery
  | "Beverages" 
  | "Canned Goods & Instant" 
  | "Snacks & Sweets" 
  | "Rice & Grains" 
  | "Personal Care" 
  | "Household & Cleaning" 
  | "Cigarettes & Alcohol" 
  | "Services & E-Load"
  // Pharmacy / Botika
  | "Prescription (Rx) Medicines"
  | "Over-The-Counter (OTC)"
  | "Vitamins & Supplements"
  | "First Aid & Antiseptics"
  | "Medical Devices & Supplies"
  | "Medicines & Pharmacy"
  // Motor Parts & Repair
  | "Engine Oils & Fluids"
  | "Tires & Tubes"
  | "Brakes & Suspension"
  | "Electrical & Spark Plugs"
  | "Drivetrain & Belts"
  | "Mechanic Labor & Services"
  | "Rider Gear & Helmets"
  // Milk Tea & Cafe
  | "Milk Tea Classics"
  | "Fruit Teas & Refreshers"
  | "Coffee & Espresso"
  | "Snacks & Finger Food"
  | "Add-ons & Sinkers"
  | string;

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string; // pcs, pack, can, bottle, kg, box, blister
  emoji: string;
  imageUrl?: string;
  isBestseller?: boolean;
  isActive: boolean;
  
  // Expiration & Pharmacy additions
  expirationDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  manufacturingDate?: string;
  genericName?: string;
  brandName?: string;
  dosage?: string;
  prescriptionRequired?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customDiscount: number; // in PHP
  subtotal: number;
}

export type PaymentMethod = "CASH" | "GCASH" | "MAYA" | "BANK_TRANSFER" | "CARD" | "CREDIT_UTANG" | "SPLIT";

export interface SplitPaymentDetail {
  cashAmount: number;
  digitalMethod: "GCASH" | "MAYA" | "BANK_TRANSFER" | "CARD";
  digitalAmount: number;
  digitalRefNumber?: string;
}

export type TransactionStatus = "COMPLETED" | "VOIDED" | "PARTIALLY_RETURNED" | "REFUNDED" | "VOID";

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface ReturnRecord {
  restocked?: boolean;
  id: string;
  transactionId: string;
  originalTransactionId?: string;
  receiptNumber: string;
  returnedItems: ReturnItem[];
  totalRefundAmount: number;
  refundAmount?: number;
  reason: string;
  notes?: string;
  processedBy: string;
  createdAt: string;
  timestamp?: string;
}

export interface Transaction {
  requestId?: string;
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
  status: TransactionStatus;
  ewalletRefNumber?: string;
  splitDetail?: SplitPaymentDetail;
  isBackdated?: boolean;
  notes?: string;
  
  // Void details
  voidReason?: string;
  voidNotes?: string;
  voidedBy?: string;
  voidedAt?: string;

  // Return tracking
  returnHistory?: ReturnRecord[];
  refundedAmount?: number;

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
  type: "DEBT_INCREASE" | "PAYMENT_RECEIVED" | "DEBT_ADJUSTMENT";
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
  startingFloat?: number; // alias
  cashSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
  status: "OPEN" | "CLOSED";
  notes?: string;
}

export type AuditAction = 
  | "SALE_CREATED" 
  | "SALE_VOIDED" 
  | "TRANSACTION_VOIDED"
  | "ITEM_RETURNED" 
  | "RETURN_PROCESSED"
  | "REFUND_ISSUED" 
  | "PRODUCT_CREATED" 
  | "PRODUCT_UPDATED" 
  | "STOCK_ADJUSTED" 
  | "USER_CREATED" 
  | "USER_UPDATED" 
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "PRESET_LOADED"
  | "SETTINGS_CHANGED";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  description: string;
  performedBy: string;
  staffName?: string; // alias
  staffRole?: string;
  targetReceiptNumber?: string;
  targetAmount?: number;
  recordId?: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  timestamp?: string; // alias
}

export interface StoreSettings {
  storeName: string;
  name?: string; // alias
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
  expirationWarningDays: number; // e.g. 30 days
  fontSizeMode: "NORMAL" | "LARGE";
  gcashNumber?: string;
  mayaNumber?: string;
  qrPhImageUrl?: string;
  ownerPin?: string;
  requirePinForReports?: boolean;
}
