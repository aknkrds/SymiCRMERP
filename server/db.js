import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'crm.db');

const db = new Database(dbPath);

// Create tables if they don't exist
const initDb = () => {
  // Customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL,
      contactName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      mobile TEXT,
      address TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Products
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT, -- Replaces description
      productType TEXT, -- percinli, sivama
      boxShape TEXT, -- Kare, Oval, etc.
      dimensions TEXT, -- JSON
      inks TEXT, -- JSON (new structure)
      features TEXT NOT NULL, -- JSON
      details TEXT,
      windowDetails TEXT, -- JSON
      lidDetails TEXT, -- JSON
      images TEXT, -- JSON
      createdAt TEXT NOT NULL
    )
  `);

  // Product Molds (Kalıp Ölçüleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_molds (
      id TEXT PRIMARY KEY,
      productType TEXT NOT NULL,
      boxShape TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      label TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Weekly Plans
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_plans (
      id TEXT PRIMARY KEY,
      weekStartDate TEXT NOT NULL,
      weekEndDate TEXT NOT NULL,
      planData TEXT NOT NULL, -- JSON
      createdAt TEXT NOT NULL
    )
  `);

  // Monthly Plans
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_plans (
      id TEXT PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      planData TEXT NOT NULL, -- JSON
      createdAt TEXT NOT NULL
    )
  `);

  // Product Migrations
  try { db.exec('ALTER TABLE products ADD COLUMN name TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE products ADD COLUMN productType TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE products ADD COLUMN boxShape TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE products ADD COLUMN inks TEXT'); } catch (e) {}

  // Orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      customerName TEXT NOT NULL,
      items TEXT NOT NULL, -- JSON
      currency TEXT NOT NULL,
      subtotal REAL NOT NULL,
      vatTotal REAL NOT NULL,
      grandTotal REAL NOT NULL,
      status TEXT NOT NULL,
      designImages TEXT, -- JSON array of strings
      deadline TEXT,
      paymentMethod TEXT,
      maturityDays INTEGER,
      jobSize TEXT, -- İşin ebadı
      boxSize TEXT, -- Kutu boyutu
      efficiency TEXT, -- Verim
      prepaymentAmount REAL,
      prepaymentRate REAL,
      gofrePrice REAL,
      gofreVatRate REAL,
      shippingPrice REAL,
      shippingVatRate REAL,
      procurementDetails TEXT, -- JSON
      productionApprovedDetails TEXT, -- JSON
      productionDiffs TEXT, -- JSON
      createdAt TEXT NOT NULL,
      FOREIGN KEY (customerId) REFERENCES customers (id)
    )
  `);

  // Add new columns to orders table if they don't exist (Migration)
  try {
    db.exec('ALTER TABLE orders ADD COLUMN paymentMethod TEXT');
  } catch (error) {
    // Column likely already exists
  }

  try {
    db.exec('ALTER TABLE orders ADD COLUMN maturityDays INTEGER');
  } catch (error) {
    // Column likely already exists
  }

  try {
    db.exec('ALTER TABLE orders ADD COLUMN prepaymentAmount REAL');
  } catch (error) {
    // Column likely already exists
  }

  try {
    db.exec('ALTER TABLE orders ADD COLUMN prepaymentRate REAL');
  } catch (error) {
    // Column likely already exists
  }
  // Add design job info columns if they don't exist
  try { db.exec('ALTER TABLE orders ADD COLUMN jobSize TEXT'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN boxSize TEXT'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN efficiency TEXT'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN stockUsage TEXT'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN gofrePrice REAL'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN gofreQuantity REAL'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN gofreUnitPrice REAL'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN gofreVatRate REAL'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN shippingPrice REAL'); } catch (error) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN shippingVatRate REAL'); } catch (error) {}
  
  // Procurement Details Migration
  try { db.exec('ALTER TABLE orders ADD COLUMN procurementDetails TEXT'); } catch (error) {}

  // Stock Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      stockNumber TEXT NOT NULL,
      company TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      category TEXT, -- 'procurement' or 'finished'
      productId TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Personnel
  db.exec(`
    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL,
      birthDate TEXT,
      birthPlace TEXT,
      tcNumber TEXT,
      address TEXT,
      homePhone TEXT,
      mobilePhone TEXT,
      email TEXT,
      emergencyContactName TEXT,
      emergencyContactRelation TEXT,
      emergencyContactPhone TEXT,
      maritalStatus TEXT,
      sskNumber TEXT,
      department TEXT,
      startDate TEXT,
      recruitmentPlace TEXT,
      endDate TEXT,
      exitReason TEXT,
      childrenCount INTEGER,
      childrenAges TEXT, -- JSON
      parentsStatus TEXT,
      hasDisability INTEGER,
      disabilityDescription TEXT,
      documents TEXT, -- JSON
      createdAt TEXT NOT NULL
    )
  `);

  // Personnel Migrations
  try { db.exec('ALTER TABLE personnel ADD COLUMN birthDate TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN birthPlace TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN tcNumber TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN address TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN homePhone TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN mobilePhone TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN email TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN emergencyContactName TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN emergencyContactRelation TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN emergencyContactPhone TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN maritalStatus TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN sskNumber TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN department TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN startDate TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN recruitmentPlace TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN endDate TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN exitReason TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN childrenCount INTEGER'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN childrenAges TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN parentsStatus TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN hasDisability INTEGER'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN disabilityDescription TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE personnel ADD COLUMN documents TEXT'); } catch (e) {}

  // Machines
  db.exec(`
    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      machineNumber TEXT NOT NULL,
      features TEXT,
      maintenanceInterval TEXT,
      lastMaintenance TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Shifts
  db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      machineId TEXT NOT NULL,
      supervisorId TEXT NOT NULL,
      personnelIds TEXT NOT NULL, -- JSON array
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      plannedQuantity INTEGER NOT NULL,
      actualQuantity INTEGER,
      wasteQuantity INTEGER,
      status TEXT NOT NULL, -- 'planned', 'active', 'completed'
      createdAt TEXT NOT NULL
    )
  `);

  // Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      username TEXT,
      ipAddress TEXT,
      path TEXT,
      actionType TEXT NOT NULL,
      payload TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Error Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      username TEXT,
      path TEXT,
      method TEXT,
      ipAddress TEXT,
      message TEXT NOT NULL,
      stack TEXT,
      context TEXT,
      createdAt TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      threadId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderName TEXT NOT NULL,
      recipientId TEXT NOT NULL,
      recipientName TEXT NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      relatedOrderId TEXT,
      isRead INTEGER DEFAULT 0, -- 0: false, 1: true
      createdAt TEXT NOT NULL
    )
  `);

  // Roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      permissions TEXT NOT NULL, -- JSON array of allowed paths/modules
      createdAt TEXT NOT NULL
    )
  `);

  // Company Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      taxOffice TEXT,
      taxNumber TEXT,
      tradeRegistryNumber TEXT,
      mersisNumber TEXT,
      bankAccountName TEXT,
      bankName TEXT,
      iban TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      roleId TEXT NOT NULL,
      fullName TEXT NOT NULL,
      isActive INTEGER DEFAULT 1, -- 1: active, 0: inactive
      createdAt TEXT NOT NULL,
      FOREIGN KEY (roleId) REFERENCES roles (id)
    )
  `);

  // Seed Roles if empty
  const roleCount = db.prepare('SELECT count(*) as count FROM roles').get();
  if (roleCount.count === 0) {
    const roles = [
      { id: '1', name: 'Admin', permissions: JSON.stringify(['all']) },
      { id: '2', name: 'Genel Müdür', permissions: JSON.stringify(['all_except_settings']) },
      { id: '3', name: 'Satış', permissions: JSON.stringify(['products', 'recipes', 'orders', 'dashboard']) },
      { id: '4', name: 'Tasarımcı', permissions: JSON.stringify(['design', 'dashboard']) },
      { id: '5', name: 'Matbaa', permissions: JSON.stringify(['procurement', 'dashboard']) },
      { id: '6', name: 'Fabrika Müdürü', permissions: JSON.stringify(['production', 'logistics', 'dashboard']) },
      { id: '7', name: 'Muhasebe', permissions: JSON.stringify(['accounting', 'dashboard']) },
      { id: '8', name: 'Sevkiyat', permissions: JSON.stringify(['logistics', 'dashboard']) },
    ];

    const insertRole = db.prepare('INSERT INTO roles (id, name, permissions, createdAt) VALUES (?, ?, ?, ?)');
    roles.forEach(role => {
      insertRole.run(role.id, role.name, role.permissions, new Date().toISOString());
    });
  }

  // Seed Admin User if empty
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (id, username, password, roleId, fullName, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertUser.run(
      'admin-user-id',
      'admin',
      'DorukNaz2010',
      '1', // Admin Role ID
      'System Admin',
      1,
      new Date().toISOString()
    );
  }

  // Migrations
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    
    // Add designImages column if it doesn't exist
    const hasDesignImages = tableInfo.some(col => col.name === 'designImages');
    if (!hasDesignImages) {
        db.prepare("ALTER TABLE orders ADD COLUMN designImages TEXT").run();
    }

    // Add procurementDetails column if it doesn't exist
    const hasProcurementDetails = tableInfo.some(col => col.name === 'procurementDetails');
    if (!hasProcurementDetails) {
        db.prepare("ALTER TABLE orders ADD COLUMN procurementDetails TEXT").run();
    }

    // Add productionApprovedDetails column if it doesn't exist
    const hasProductionApprovedDetails = tableInfo.some(col => col.name === 'productionApprovedDetails');
    if (!hasProductionApprovedDetails) {
        db.prepare("ALTER TABLE orders ADD COLUMN productionApprovedDetails TEXT").run();
    }

    // Add productionDiffs column if it doesn't exist
    const hasProductionDiffs = tableInfo.some(col => col.name === 'productionDiffs');
    if (!hasProductionDiffs) {
        db.prepare("ALTER TABLE orders ADD COLUMN productionDiffs TEXT").run();
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
};

initDb();

export default db;
