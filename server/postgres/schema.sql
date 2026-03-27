CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  product_type TEXT,
  box_shape TEXT,
  dimensions JSONB,
  inks JSONB,
  features JSONB NOT NULL,
  details TEXT,
  window_details JSONB,
  lid_details JSONB,
  images JSONB,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_molds (
  id TEXT PRIMARY KEY,
  product_type TEXT NOT NULL,
  box_shape TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id TEXT PRIMARY KEY,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_plans (
  id TEXT PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL,
  currency TEXT NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  vat_total DOUBLE PRECISION NOT NULL,
  grand_total DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  design_images JSONB,
  deadline TEXT,
  procurement_status TEXT,
  production_status TEXT,
  procurement_date TEXT,
  invoice_url TEXT,
  waybill_url TEXT,
  packaging_type TEXT,
  packaging_count DOUBLE PRECISION,
  package_number TEXT,
  vehicle_plate TEXT,
  trailer_plate TEXT,
  additional_doc_url TEXT,
  assigned_user_id TEXT,
  assigned_user_name TEXT,
  assigned_role_name TEXT,
  payment_method TEXT,
  maturity_days INTEGER,
  job_size TEXT,
  box_size TEXT,
  efficiency TEXT,
  prepayment_amount DOUBLE PRECISION,
  prepayment_rate DOUBLE PRECISION,
  gofre_price DOUBLE PRECISION,
  gofre_quantity DOUBLE PRECISION,
  gofre_unit_price DOUBLE PRECISION,
  gofre_vat_rate DOUBLE PRECISION,
  shipping_price DOUBLE PRECISION,
  shipping_vat_rate DOUBLE PRECISION,
  procurement_details JSONB,
  production_approved_details JSONB,
  production_diffs JSONB,
  stock_usage JSONB,
  design_status TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS design_job_details JSONB;

CREATE TABLE IF NOT EXISTS procurement_dispatches (
  id TEXT PRIMARY KEY,
  dispatch_date TEXT NOT NULL,
  vehicle_plate TEXT,
  driver_names TEXT,
  notes TEXT,
  lines JSONB NOT NULL,
  production_receipt JSONB,
  production_approved_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS procurement_dispatch_change_requests (
  id TEXT PRIMARY KEY,
  dispatch_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  decided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  stock_number TEXT NOT NULL,
  company TEXT NOT NULL,
  product TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  product_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  birth_date TEXT,
  birth_place TEXT,
  tc_number TEXT,
  address TEXT,
  home_phone TEXT,
  mobile_phone TEXT,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  emergency_contact_phone TEXT,
  marital_status TEXT,
  ssk_number TEXT,
  department TEXT,
  start_date TEXT,
  recruitment_place TEXT,
  end_date TEXT,
  exit_reason TEXT,
  children_count INTEGER,
  children_ages JSONB,
  parents_status TEXT,
  has_disability BOOLEAN,
  disability_description TEXT,
  documents JSONB,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  machine_number TEXT NOT NULL,
  features TEXT,
  maintenance_interval TEXT,
  last_maintenance TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  supervisor_id TEXT NOT NULL,
  personnel_ids JSONB NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  planned_quantity INTEGER NOT NULL,
  actual_quantity INTEGER,
  waste_quantity INTEGER,
  status TEXT NOT NULL,
  produced_quantity DOUBLE PRECISION,
  scrap_quantity DOUBLE PRECISION,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  ip_address TEXT,
  path TEXT,
  action_type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  full_name TEXT,
  role_id TEXT,
  role_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_success BOOLEAN,
  message TEXT,
  login_at TEXT,
  logout_at TEXT,
  duration_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS user_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  full_name TEXT,
  role_id TEXT,
  role_name TEXT,
  ip_address TEXT,
  path TEXT,
  action_type TEXT,
  payload TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  path TEXT,
  method TEXT,
  ip_address TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  related_order_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY,
  company_name TEXT,
  contact_name TEXT,
  name TEXT,
  logo TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  website TEXT,
  tax_office TEXT,
  tax_number TEXT,
  trade_registry_number TEXT,
  mersis_number TEXT,
  bank_account_name TEXT,
  bank_name TEXT,
  iban TEXT,
  updated_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  related_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_stock_items_stock_number ON stock_items(stock_number);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE TABLE IF NOT EXISTS user_desktop_data (
  username TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
