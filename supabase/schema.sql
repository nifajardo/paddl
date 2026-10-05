-- ==============================================================================
-- PEDDLR PLUS: PRODUCTION DATABASE SCHEMA FOR SUPABASE
-- Run this in your Supabase Project -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    category TEXT NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 10,
    unit TEXT NOT NULL DEFAULT 'pcs',
    emoji TEXT NOT NULL DEFAULT '🥫',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CUSTOMERS TABLE (UTANG / CREDIT BOOK)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 2000.00,
    total_debt NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DEBT ENTRIES TABLE (CREDIT & PAYMENT AUDIT LOG)
CREATE TABLE IF NOT EXISTS debt_entries (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    transaction_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('DEBT_INCREASE', 'PAYMENT_RECEIVED')),
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by TEXT NOT NULL
);

-- 5. TRANSACTIONS TABLE (POS SALES)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'NONE',
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'GCASH', 'MAYA', 'CREDIT_UTANG', 'SPLIT')),
    amount_tendered NUMERIC(12, 2) NOT NULL,
    change_due NUMERIC(12, 2) NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    cashier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    ewallet_ref_number TEXT,
    is_backdated BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    receipt_ref TEXT,
    recorded_by TEXT NOT NULL
);

-- 7. CASH DRAWER SHIFTS TABLE
CREATE TABLE IF NOT EXISTS cash_drawers (
    id TEXT PRIMARY KEY,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by TEXT NOT NULL,
    closed_by TEXT,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 1500.00,
    cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_in NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_out NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 1500.00,
    actual_cash NUMERIC(12, 2),
    discrepancy NUMERIC(12, 2),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT
);

-- 8. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary_store',
    store_name TEXT NOT NULL DEFAULT 'Tindahan Ni Aling Nena',
    tagline TEXT NOT NULL DEFAULT 'Your Friendly Neighborhood Sari-Sari & Grocery Store',
    address TEXT NOT NULL DEFAULT 'Block 14 Lot 8, Sampaguita St., Pasig City',
    phone TEXT NOT NULL DEFAULT '0917-889-1234',
    tin_number TEXT DEFAULT '123-456-789-000',
    receipt_footer_message TEXT DEFAULT 'Salamat po sa inyong pagtangkilik! Please come again.',
    tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    currency_symbol TEXT NOT NULL DEFAULT '₱',
    enable_sound_effects BOOLEAN NOT NULL DEFAULT TRUE,
    low_stock_alert_threshold INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STAFF USERS TABLE
CREATE TABLE IF NOT EXISTS staff_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER')),
    pin TEXT NOT NULL DEFAULT '0000',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & OPEN PERMISSIVE POLICIES FOR TESTING
-- ==============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write during testing
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon all on products" ON products;
    CREATE POLICY "Allow anon all on products" ON products FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on customers" ON customers;
    CREATE POLICY "Allow anon all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on debt_entries" ON debt_entries;
    CREATE POLICY "Allow anon all on debt_entries" ON debt_entries FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on transactions" ON transactions;
    CREATE POLICY "Allow anon all on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on expenses" ON expenses;
    CREATE POLICY "Allow anon all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on cash_drawers" ON cash_drawers;
    CREATE POLICY "Allow anon all on cash_drawers" ON cash_drawers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on store_settings" ON store_settings;
    CREATE POLICY "Allow anon all on store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on staff_users" ON staff_users;
    CREATE POLICY "Allow anon all on staff_users" ON staff_users FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- INSERT INITIAL SEED DATA (AUTHENTIC PHILIPPINE MSME PRESETS)
-- ==============================================================================

-- Store Settings
INSERT INTO store_settings (id, store_name, tagline, address, phone, tin_number, receipt_footer_message)
VALUES ('primary_store', 'Tindahan Ni Aling Nena', 'Your Friendly Neighborhood Sari-Sari & Grocery Store', 'Block 14 Lot 8, Sampaguita St., Brgy. San Antonio, Pasig City', '0917-889-1234', '123-456-789-000', 'Salamat po sa inyong pagtangkilik! Please come again.')
ON CONFLICT (id) DO NOTHING;

-- Staff Users
INSERT INTO staff_users (id, name, email, role, pin)
VALUES 
    ('staff-1', 'Aling Nena', 'nena@store.ph', 'OWNER', '1234'),
    ('staff-2', 'Kuya Jun', 'jun@store.ph', 'MANAGER', '5678'),
    ('staff-3', 'Maria Santos', 'maria@store.ph', 'CASHIER', '0000')
ON CONFLICT (id) DO NOTHING;

-- Initial Products
INSERT INTO products (id, name, barcode, category, cost_price, selling_price, stock, min_stock_alert, unit, emoji)
VALUES 
    ('prod-1', 'San Miguel Pale Pilsen 330ml', '4800016010015', 'Cigarettes & Alcohol', 42.00, 55.00, 48, 12, 'bottle', '🍺'),
    ('prod-2', 'Red Horse Beer 500ml Can', '4800016020021', 'Cigarettes & Alcohol', 58.00, 75.00, 24, 10, 'can', '🍻'),
    ('prod-3', 'Lucky Me! Pancit Canton Kalamansi', '4800016030038', 'Canned Goods & Instant', 14.50, 19.00, 95, 20, 'pack', '🍜'),
    ('prod-4', 'Lucky Me! Pancit Canton Extra Hot', '4800016030045', 'Canned Goods & Instant', 14.50, 19.00, 8, 15, 'pack', '🌶️'),
    ('prod-5', 'Kopiko Blanca 3-in-1 Coffee 30g', '8996001301018', 'Beverages', 8.50, 13.00, 120, 25, 'sachet', '☕'),
    ('prod-6', 'Great Taste White Twin Pack 50g', '4800016040051', 'Beverages', 14.00, 20.00, 6, 15, 'twin pack', '☕'),
    ('prod-7', 'Coca-Cola Mismo 290ml', '4800016050067', 'Beverages', 15.00, 22.00, 36, 12, 'bottle', '🥤'),
    ('prod-8', 'Sprite 1.5L PET', '4800016050074', 'Beverages', 62.00, 80.00, 14, 6, 'bottle', '🍾'),
    ('prod-9', 'Argentina Corned Beef 150g', '4800016060080', 'Canned Goods & Instant', 38.00, 48.00, 32, 10, 'can', '🥫'),
    ('prod-10', 'Century Tuna Flakes in Oil 155g', '4800016060097', 'Canned Goods & Instant', 36.50, 46.00, 40, 12, 'can', '🐟'),
    ('prod-11', 'Dinorado Rice (Premium Quality)', '4800016070102', 'Rice & Grains', 48.00, 58.00, 150, 30, 'kg', '🍚'),
    ('prod-12', 'Sinandomeng Special Rice', '4800016070119', 'Rice & Grains', 42.00, 50.00, 200, 50, 'kg', '🌾'),
    ('prod-13', 'Piattos Cheese 85g Regular', '4800016080125', 'Snacks & Sweets', 32.00, 42.00, 25, 8, 'pack', '🥔'),
    ('prod-14', 'Chippy Barbecue 110g', '4800016080132', 'Snacks & Sweets', 28.00, 36.00, 3, 10, 'pack', '🌽'),
    ('prod-15', 'Tide Powder with Downy 70g', '4800016090148', 'Household & Cleaning', 12.00, 17.00, 65, 15, 'sachet', '🧼'),
    ('prod-16', 'Safeguard Pure White Soap 130g', '4800016100151', 'Personal Care', 46.00, 58.00, 22, 6, 'bar', '🧼'),
    ('prod-17', 'Smart Regular Load ₱50', 'EL-SMART-50', 'Services & E-Load', 47.50, 53.00, 999, 50, 'load', '📱'),
    ('prod-18', 'Globe Regular Load ₱100', 'EL-GLOBE-100', 'Services & E-Load', 95.00, 105.00, 999, 50, 'load', '📲')
ON CONFLICT (id) DO NOTHING;

-- Initial Customers (Credit / Utang)
INSERT INTO customers (id, name, phone, address, credit_limit, total_debt, notes)
VALUES 
    ('cust-1', 'Mang Boy (Tricycle Driver)', '0918-123-4567', 'Area 2, Sitio Sto. Niño', 1500.00, 680.00, 'Pays every Saturday afternoon after boundary'),
    ('cust-2', 'Ate Vicky (Sari-sari neighbor)', '0920-987-6543', 'Block 12 Lot 3, Sampaguita St.', 3000.00, 1450.00, 'Reliable, settles monthly on payday (15th/30th)'),
    ('cust-3', 'Kapitan Noel', '0999-555-8822', 'Barangay Hall Complex', 5000.00, 320.00, 'Barangay events snacks sponsor'),
    ('cust-4', 'Nanay Tessie (Teacher)', '0917-333-2211', 'San Antonio Elementary School', 2000.00, 0.00, 'Always settles in full on 15th')
ON CONFLICT (id) DO NOTHING;
