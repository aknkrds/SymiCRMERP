import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQLITE_PATH =
  process.env.SQLITE_PATH ||
  path.join(__dirname, '..', 'crm.db');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  process.stderr.write('DATABASE_URL gerekli (PostgreSQL bağlantı adresi).\n');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'server', 'postgres', 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf8');

const JSON_COLUMNS = {
  customers: [],
  products: ['dimensions', 'inks', 'features', 'windowDetails', 'lidDetails', 'images'],
  product_molds: [],
  weekly_plans: ['planData'],
  monthly_plans: ['planData'],
  orders: ['items', 'designImages', 'stockUsage', 'procurementDetails', 'productionApprovedDetails', 'productionDiffs'],
  procurement_dispatches: ['lines', 'productionReceipt'],
  procurement_dispatch_change_requests: [],
  counters: [],
  stock_items: [],
  personnel: ['childrenAges', 'documents'],
  machines: [],
  shifts: ['personnelIds'],
  logs: [],
  login_logs: [],
  user_actions: [],
  error_logs: [],
  messages: [],
  roles: ['permissions'],
  company_settings: [],
  users: [],
  notifications: [],
};

const COLUMN_RENAMES = {
  customers: {
    companyName: 'company_name',
    contactName: 'contact_name',
    createdAt: 'created_at',
  },
  products: {
    productType: 'product_type',
    boxShape: 'box_shape',
    windowDetails: 'window_details',
    lidDetails: 'lid_details',
    createdAt: 'created_at',
  },
  product_molds: {
    productType: 'product_type',
    boxShape: 'box_shape',
    createdAt: 'created_at',
  },
  weekly_plans: {
    weekStartDate: 'week_start_date',
    weekEndDate: 'week_end_date',
    planData: 'plan_data',
    createdAt: 'created_at',
  },
  monthly_plans: {
    planData: 'plan_data',
    createdAt: 'created_at',
  },
  orders: {
    customerId: 'customer_id',
    customerName: 'customer_name',
    designImages: 'design_images',
    procurementStatus: 'procurement_status',
    productionStatus: 'production_status',
    procurementDate: 'procurement_date',
    invoiceUrl: 'invoice_url',
    waybillUrl: 'waybill_url',
    packagingType: 'packaging_type',
    packagingCount: 'packaging_count',
    packageNumber: 'package_number',
    vehiclePlate: 'vehicle_plate',
    trailerPlate: 'trailer_plate',
    additionalDocUrl: 'additional_doc_url',
    assignedUserId: 'assigned_user_id',
    assignedUserName: 'assigned_user_name',
    assignedRoleName: 'assigned_role_name',
    paymentMethod: 'payment_method',
    maturityDays: 'maturity_days',
    jobSize: 'job_size',
    boxSize: 'box_size',
    prepaymentAmount: 'prepayment_amount',
    prepaymentRate: 'prepayment_rate',
    gofrePrice: 'gofre_price',
    gofreVatRate: 'gofre_vat_rate',
    shippingPrice: 'shipping_price',
    shippingVatRate: 'shipping_vat_rate',
    procurementDetails: 'procurement_details',
    productionApprovedDetails: 'production_approved_details',
    productionDiffs: 'production_diffs',
    stockUsage: 'stock_usage',
    vatTotal: 'vat_total',
    grandTotal: 'grand_total',
    designStatus: 'design_status',
    createdAt: 'created_at',
  },
  procurement_dispatches: {
    dispatchDate: 'dispatch_date',
    vehiclePlate: 'vehicle_plate',
    driverNames: 'driver_names',
    productionReceipt: 'production_receipt',
    productionApprovedAt: 'production_approved_at',
    createdAt: 'created_at',
  },
  procurement_dispatch_change_requests: {
    dispatchId: 'dispatch_id',
    decidedAt: 'decided_at',
    createdAt: 'created_at',
  },
  stock_items: {
    stockNumber: 'stock_number',
    productId: 'product_id',
    createdAt: 'created_at',
  },
  personnel: {
    firstName: 'first_name',
    lastName: 'last_name',
    birthDate: 'birth_date',
    birthPlace: 'birth_place',
    tcNumber: 'tc_number',
    homePhone: 'home_phone',
    mobilePhone: 'mobile_phone',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactRelation: 'emergency_contact_relation',
    emergencyContactPhone: 'emergency_contact_phone',
    maritalStatus: 'marital_status',
    sskNumber: 'ssk_number',
    startDate: 'start_date',
    recruitmentPlace: 'recruitment_place',
    endDate: 'end_date',
    exitReason: 'exit_reason',
    childrenCount: 'children_count',
    childrenAges: 'children_ages',
    parentsStatus: 'parents_status',
    hasDisability: 'has_disability',
    disabilityDescription: 'disability_description',
    createdAt: 'created_at',
  },
  machines: {
    machineNumber: 'machine_number',
    maintenanceInterval: 'maintenance_interval',
    lastMaintenance: 'last_maintenance',
    createdAt: 'created_at',
  },
  shifts: {
    orderId: 'order_id',
    machineId: 'machine_id',
    supervisorId: 'supervisor_id',
    personnelIds: 'personnel_ids',
    startTime: 'start_time',
    endTime: 'end_time',
    plannedQuantity: 'planned_quantity',
    actualQuantity: 'actual_quantity',
    wasteQuantity: 'waste_quantity',
    producedQuantity: 'produced_quantity',
    scrapQuantity: 'scrap_quantity',
    createdAt: 'created_at',
  },
  logs: {
    userId: 'user_id',
    ipAddress: 'ip_address',
    actionType: 'action_type',
    createdAt: 'created_at',
  },
  login_logs: {
    userId: 'user_id',
    fullName: 'full_name',
    roleId: 'role_id',
    roleName: 'role_name',
    ipAddress: 'ip_address',
    userAgent: 'user_agent',
    isSuccess: 'is_success',
    loginAt: 'login_at',
    logoutAt: 'logout_at',
    durationSeconds: 'duration_seconds',
  },
  user_actions: {
    userId: 'user_id',
    fullName: 'full_name',
    roleId: 'role_id',
    roleName: 'role_name',
    ipAddress: 'ip_address',
    actionType: 'action_type',
    createdAt: 'created_at',
  },
  error_logs: {
    userId: 'user_id',
    ipAddress: 'ip_address',
    createdAt: 'created_at',
  },
  messages: {
    threadId: 'thread_id',
    senderId: 'sender_id',
    senderName: 'sender_name',
    recipientId: 'recipient_id',
    recipientName: 'recipient_name',
    relatedOrderId: 'related_order_id',
    isRead: 'is_read',
    createdAt: 'created_at',
  },
  roles: {
    createdAt: 'created_at',
  },
  company_settings: {
    companyName: 'company_name',
    contactName: 'contact_name',
    logoUrl: 'logo_url',
    updatedAt: 'updated_at',
    taxOffice: 'tax_office',
    taxNumber: 'tax_number',
    tradeRegistryNumber: 'trade_registry_number',
    mersisNumber: 'mersis_number',
    bankAccountName: 'bank_account_name',
    bankName: 'bank_name',
    createdAt: 'created_at',
  },
  users: {
    roleId: 'role_id',
    fullName: 'full_name',
    isActive: 'is_active',
    createdAt: 'created_at',
  },
  notifications: {
    userId: 'user_id',
    roleId: 'role_id',
    relatedId: 'related_id',
    isRead: 'is_read',
    createdAt: 'created_at',
  },
};

const BOOL_COLUMNS = {
  personnel: ['hasDisability'],
  users: ['isActive'],
  messages: ['isRead'],
  notifications: ['isRead'],
  login_logs: ['isSuccess'],
};

const parseJsonMaybe = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  const str = String(value).trim();
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const parseNumberMaybe = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const cleaned = s.replace(/\s+/g, '').replace(',', '.');
  const m = cleaned.match(/^%?(\d+(?:\.\d+)?)%?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
};

const JSON_DEFAULTS = {
  products: { features: {} },
  weekly_plans: { planData: {} },
  monthly_plans: { planData: {} },
  orders: { items: [] },
  procurement_dispatches: { lines: [] },
  shifts: { personnelIds: [] },
  roles: { permissions: [] },
};

const normalizeRow = (table, row) => {
  const jsonCols = new Set(JSON_COLUMNS[table] || []);
  const boolCols = new Set(BOOL_COLUMNS[table] || []);
  const renames = COLUMN_RENAMES[table] || {};
  const defaults = JSON_DEFAULTS[table] || {};
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const outKey = renames[key] || key;
    if (jsonCols.has(key)) {
      const parsed = parseJsonMaybe(value);
      out[outKey] = parsed ?? (defaults[key] ?? null);
      continue;
    }
    if (boolCols.has(key)) {
      if (typeof value === 'boolean') out[outKey] = value;
      else out[outKey] = value === 1 || value === '1' || value === true;
      continue;
    }
    out[outKey] = value;
  }
  return out;
};

const getSqliteTables = (sqliteDb) => {
  const rows = sqliteDb.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `).all();
  return rows.map(r => r.name);
};

const buildInsert = (table, row) => {
  const keys = Object.keys(row);
  const cols = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(k => row[k]);
  const conflictKey = row.id !== undefined ? 'id' : (row.name !== undefined ? 'name' : null);
  const sql = conflictKey
    ? `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictKey}) DO NOTHING`
    : `INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`;
  return { sql, values };
};

const maskDbUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '[invalid DATABASE_URL]';
  }
};

const formatConnectError = (e) => {
  if (!e) return 'Bilinmeyen hata';
  if (e instanceof AggregateError && Array.isArray(e.errors)) {
    const parts = e.errors
      .map((err) => (err && err.message ? err.message : String(err)))
      .filter(Boolean);
    return parts.length ? parts.join(' | ') : 'AggregateError';
  }
  return e.message || String(e);
};

const main = async () => {
  process.stdout.write(`SQLite: ${SQLITE_PATH}\n`);
  const sqliteDb = new Database(SQLITE_PATH, { readonly: true });

  const pgClient = new Client({ connectionString: DATABASE_URL });
  try {
    await pgClient.connect();
  } catch (e) {
    process.stderr.write(`PostgreSQL bağlantısı kurulamadı: ${formatConnectError(e)}\n`);
    process.stderr.write(`DATABASE_URL: ${maskDbUrl(DATABASE_URL)}\n`);
    process.stderr.write('PostgreSQL sunucusu çalışıyor mu? (Docker Desktop/Colima/Postgres.app/Homebrew)\n');
    process.stderr.write('Örnek: postgresql://kullanici:sifre@localhost:5432/veritabani\n');
    process.exit(1);
  }

  process.stdout.write('PostgreSQL şeması uygulanıyor...\n');
  await pgClient.query(schemaSql);

  const pgColumnsByTable = new Map();
  const pgColumnTypesByTable = new Map();
  const loadPgColumns = async (table) => {
    if (pgColumnsByTable.has(table)) return pgColumnsByTable.get(table);
    const res = await pgClient.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const set = new Set(res.rows.map(r => r.column_name));
    pgColumnsByTable.set(table, set);
    return set;
  };

  const loadPgColumnTypes = async (table) => {
    if (pgColumnTypesByTable.has(table)) return pgColumnTypesByTable.get(table);
    const res = await pgClient.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const map = new Map(res.rows.map(r => [r.column_name, r.data_type]));
    pgColumnTypesByTable.set(table, map);
    return map;
  };

  const sqliteTables = new Set(getSqliteTables(sqliteDb));
  const tables = Object.keys(JSON_COLUMNS).filter(t => sqliteTables.has(t));

  for (const table of tables) {
    const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) continue;

    process.stdout.write(`${table}: ${rows.length} kayıt aktarılıyor...\n`);
    const pgCols = await loadPgColumns(table);
    const pgTypes = await loadPgColumnTypes(table);
    await pgClient.query('BEGIN');
    try {
      for (const r of rows) {
        const normalized = normalizeRow(table, r);
        const filtered = Object.fromEntries(
          Object.entries(normalized).filter(([k]) => pgCols.has(k))
        );
        if (table === 'orders') {
          const raw = filtered.prepayment_amount;
          if (typeof raw === 'string' && raw.includes('%')) {
            const pct = parseNumberMaybe(raw);
            if (pct !== null && (filtered.prepayment_rate === null || filtered.prepayment_rate === undefined)) {
              filtered.prepayment_rate = pct;
            }
            filtered.prepayment_amount = null;
          }
        }
        for (const [k, v] of Object.entries(filtered)) {
          if (v === null || v === undefined) continue;
          if (pgTypes.get(k) === 'jsonb' && typeof v === 'object') {
            filtered[k] = JSON.stringify(v);
          }
          if ((pgTypes.get(k) === 'double precision' || pgTypes.get(k) === 'integer') && typeof filtered[k] === 'string') {
            const n = parseNumberMaybe(filtered[k]);
            filtered[k] = n;
          }
        }
        const { sql, values } = buildInsert(table, filtered);
        await pgClient.query(sql, values);
      }
      await pgClient.query('COMMIT');
    } catch (e) {
      await pgClient.query('ROLLBACK');
      throw new Error(`${table} aktarımı başarısız: ${e?.message || e}`);
    }
  }

  await pgClient.end();
  process.stdout.write('Aktarım tamamlandı.\n');
};

main().catch((e) => {
  process.stderr.write((e?.message || String(e)) + '\n');
  process.exit(1);
});
