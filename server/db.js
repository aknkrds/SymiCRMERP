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
      description TEXT,
      dimensions TEXT NOT NULL, -- JSON
      features TEXT NOT NULL, -- JSON
      details TEXT,
      windowDetails TEXT, -- JSON
      lidDetails TEXT, -- JSON
      images TEXT, -- JSON
      createdAt TEXT NOT NULL
    )
  `);

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
      createdAt TEXT NOT NULL,
      FOREIGN KEY (customerId) REFERENCES customers (id)
    )
  `);

  // Stock Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      stockNumber TEXT NOT NULL,
      company TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
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
      createdAt TEXT NOT NULL
    )
  `);

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
      personnelIds TEXT NOT NULL, -- JSON array of IDs
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      plannedQuantity REAL NOT NULL,
      producedQuantity REAL DEFAULT 0,
      scrapQuantity REAL DEFAULT 0,
      status TEXT DEFAULT 'planned', -- planned, active, completed
      createdAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id),
      FOREIGN KEY (machineId) REFERENCES machines(id),
      FOREIGN KEY (supervisorId) REFERENCES personnel(id)
    )
  `);

  // Migrations
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    
    // Add designImages column if it doesn't exist
    const hasDesignImages = tableInfo.some(col => col.name === 'designImages');
    if (!hasDesignImages) {
        db.prepare("ALTER TABLE orders ADD COLUMN designImages TEXT").run();
    }

    // Add procurementStatus column if it doesn't exist
    const hasProcurementStatus = tableInfo.some(col => col.name === 'procurementStatus');
    if (!hasProcurementStatus) {
        db.prepare("ALTER TABLE orders ADD COLUMN procurementStatus TEXT").run();
    }

    // Add productionStatus column if it doesn't exist
    const hasProductionStatus = tableInfo.some(col => col.name === 'productionStatus');
    if (!hasProductionStatus) {
        db.prepare("ALTER TABLE orders ADD COLUMN productionStatus TEXT").run();
    }

    // Add procurementDate column if it doesn't exist
    const hasProcurementDate = tableInfo.some(col => col.name === 'procurementDate');
    if (!hasProcurementDate) {
        db.prepare("ALTER TABLE orders ADD COLUMN procurementDate TEXT").run();
    }

    // Add invoiceUrl column if it doesn't exist
    const hasInvoiceUrl = tableInfo.some(col => col.name === 'invoiceUrl');
    if (!hasInvoiceUrl) {
        db.prepare("ALTER TABLE orders ADD COLUMN invoiceUrl TEXT").run();
    }

    // Add waybillUrl column if it doesn't exist
    const hasWaybillUrl = tableInfo.some(col => col.name === 'waybillUrl');
    if (!hasWaybillUrl) {
        db.prepare("ALTER TABLE orders ADD COLUMN waybillUrl TEXT").run();
    }

    // Add shipment columns
    const hasPackagingType = tableInfo.some(col => col.name === 'packagingType');
    if (!hasPackagingType) {
        db.prepare("ALTER TABLE orders ADD COLUMN packagingType TEXT").run();
    }
    const hasPackagingCount = tableInfo.some(col => col.name === 'packagingCount');
    if (!hasPackagingCount) {
        db.prepare("ALTER TABLE orders ADD COLUMN packagingCount REAL").run();
    }
    const hasPackageNumber = tableInfo.some(col => col.name === 'packageNumber');
    if (!hasPackageNumber) {
        db.prepare("ALTER TABLE orders ADD COLUMN packageNumber TEXT").run();
    }
    const hasVehiclePlate = tableInfo.some(col => col.name === 'vehiclePlate');
    if (!hasVehiclePlate) {
        db.prepare("ALTER TABLE orders ADD COLUMN vehiclePlate TEXT").run();
    }
    const hasTrailerPlate = tableInfo.some(col => col.name === 'trailerPlate');
    if (!hasTrailerPlate) {
        db.prepare("ALTER TABLE orders ADD COLUMN trailerPlate TEXT").run();
    }
    const hasAdditionalDocUrl = tableInfo.some(col => col.name === 'additionalDocUrl');
    if (!hasAdditionalDocUrl) {
        db.prepare("ALTER TABLE orders ADD COLUMN additionalDocUrl TEXT").run();
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
};

initDb();

export default db;
