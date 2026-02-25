import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import { execSync } from 'child_process';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/img', express.static(path.join(process.cwd(), 'server/img')));
app.use('/doc', express.static(path.join(process.cwd(), 'server/doc')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dir = 'server/img';
    if (req.query.folder === 'doc') {
        dir = 'server/doc';
    } else if (req.query.folder) {
        // Sanitize folder name to prevent directory traversal
        const folder = req.query.folder.replace(/[^a-zA-Z0-9\-_]/g, '');
        dir = path.join(dir, folder);
    }
    
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    let originalName = file.originalname;
    // Sanitize filename to avoid issues
    originalName = originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    
    let name = path.parse(originalName).name;
    let ext = path.parse(originalName).ext;
    let finalName = originalName;
    let counter = 1;

    // Determine directory
    let dir = 'server/img';
    if (req.query.folder === 'doc') {
        dir = 'server/doc';
    } else if (req.query.folder) {
        const folder = req.query.folder.replace(/[^a-zA-Z0-9\-_]/g, '');
        dir = path.join(dir, folder);
    }

    // Check for duplicate filenames and append suffix if needed
    while (fs.existsSync(path.join(dir, finalName))) {
      finalName = `${name}-${counter}${ext}`;
      counter++;
    }
    cb(null, finalName);
  }
});

const upload = multer({ storage: storage });

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
};

const logError = (req, error, context = {}) => {
  try {
    const id = crypto.randomUUID();
    const ipAddress = getClientIp(req);
    const pathValue = req.path;
    const method = req.method;
    const message = error && error.message ? String(error.message) : String(error);
    const stack = error && error.stack ? String(error.stack) : null;
    const contextJson = context && Object.keys(context).length > 0 ? JSON.stringify(context) : null;

    db.prepare(`
      INSERT INTO error_logs (id, userId, username, path, method, ipAddress, message, stack, context, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      context.userId || null,
      context.username || null,
      pathValue,
      method,
      ipAddress,
      message,
      stack,
      contextJson,
      new Date().toISOString()
    );
  } catch (loggingError) {
    console.error('Error while writing to error_logs', loggingError);
  }
};

// Get products sold to a specific customer
app.get('/api/customers/:customerId/products', (req, res) => {
  try {
    const { customerId } = req.params;
    
    // 1. Get all orders for this customer
    const orders = db.prepare('SELECT items FROM orders WHERE customerId = ?').all(customerId);
    
    if (orders.length === 0) {
      return res.json([]);
    }

    // 2. Extract unique product IDs
    const productIds = new Set();
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items);
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.productId) productIds.add(item.productId);
            if (item.product_id) productIds.add(item.product_id);
          });
        }
      } catch (e) {
        console.error('Error parsing order items:', e);
      }
    });

    if (productIds.size === 0) {
      return res.json([]);
    }

    // 3. Fetch product details
    const placeholders = [...productIds].map(() => '?').join(',');
    const products = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...productIds);
    
    // Parse JSON fields
    const formattedProducts = products.map(p => ({
      ...p,
      dimensions: JSON.parse(p.dimensions || '{}'),
      features: JSON.parse(p.features || '{}'),
      inks: JSON.parse(p.inks || '{}'),
      windowDetails: JSON.parse(p.windowDetails || '{}'),
      lidDetails: JSON.parse(p.lidDetails || '{}'),
      images: JSON.parse(p.images || '{}')
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching customer products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the URL to access the file
    // Construct full URL
    const protocol = req.protocol;
    const host = req.get('host');
    let fileUrl = '';
    
    if (req.query.folder === 'doc') {
        fileUrl = `${protocol}://${host}/doc/${req.file.filename}`;
    } else {
        const folder = req.query.folder ? req.query.folder.replace(/[^a-zA-Z0-9\-_]/g, '') + '/' : '';
        fileUrl = `${protocol}://${host}/img/${folder}${req.file.filename}`;
    }
    
    res.json({ url: fileUrl, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MESSAGING ENDPOINTS ---

// Get messages for a specific user (sent and received)
app.get('/api/messages', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE senderId = ? OR recipientId = ?
      ORDER BY createdAt DESC
    `).all(userId, userId);
    
    // Convert isRead to boolean
    const formattedMessages = messages.map(m => ({
      ...m,
      isRead: !!m.isRead
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ALL messages (Admin only)
app.get('/api/admin/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages ORDER BY createdAt DESC').all();
    const formattedMessages = messages.map(m => ({
      ...m,
      isRead: !!m.isRead
    }));
    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
app.post('/api/messages', (req, res) => {
  try {
    const { 
      threadId, 
      senderId, 
      senderName, 
      recipientId, 
      recipientName, 
      subject, 
      content, 
      relatedOrderId 
    } = req.body;

    if (!senderId || !recipientId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = crypto.randomUUID();
    const finalThreadId = threadId || id;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO messages (
        id, threadId, senderId, senderName, recipientId, recipientName, 
        subject, content, relatedOrderId, isRead, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(
      id, finalThreadId, senderId, senderName, recipientId, recipientName,
      subject, content, relatedOrderId, createdAt
    );

    res.json({ id, threadId: finalThreadId, createdAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
app.put('/api/messages/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE messages SET isRead = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message (Admin only)
app.delete('/api/admin/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- COMPANY SETTINGS ENDPOINTS ---

app.get('/api/company-settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/company-settings', (req, res) => {
  try {
    const { companyName, contactName, address, phone, mobile, logoUrl } = req.body;
    const updatedAt = new Date().toISOString();
    
    db.prepare(`
      UPDATE company_settings 
      SET companyName = ?, contactName = ?, address = ?, phone = ?, mobile = ?, logoUrl = ?, updatedAt = ?
      WHERE id = 1
    `).run(companyName, contactName, address, phone, mobile, logoUrl, updatedAt);
    
    res.json({ success: true, updatedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- BACKUP & RESTORE ---
const ensureDir = (p) => {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
};

const BACKUP_DIR = path.join(process.cwd(), 'server', 'backups');
ensureDir(BACKUP_DIR);

const tmpBase = path.join(process.cwd(), 'server', '_backup_tmp');
ensureDir(tmpBase);

// Export backup: includes SQLite db file and uploaded assets (img/doc)
app.get('/api/backup/export', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tmpDir = path.join(tmpBase, `backup-${timestamp}`);
    ensureDir(tmpDir);
    // Copy DB file
    const dbFile = path.join(process.cwd(), 'crm.db');
    if (fs.existsSync(dbFile)) {
      fs.cpSync(dbFile, path.join(tmpDir, 'crm.db'));
    } else {
      throw new Error('Veritabanı dosyası bulunamadı: crm.db');
    }
    // Copy assets
    const imgSrc = path.join(process.cwd(), 'server', 'img');
    const docSrc = path.join(process.cwd(), 'server', 'doc');
    if (fs.existsSync(imgSrc)) {
      fs.cpSync(imgSrc, path.join(tmpDir, 'img'), { recursive: true });
    }
    if (fs.existsSync(docSrc)) {
      fs.cpSync(docSrc, path.join(tmpDir, 'doc'), { recursive: true });
    }
    // Create archive with tar (tar.gz)
    const archiveName = `backup-${timestamp}.tar.gz`;
    const archivePath = path.join(BACKUP_DIR, archiveName);
    execSync(`tar -czf "${archivePath}" -C "${tmpDir}" .`);
    // Stream download
    res.download(archivePath, archiveName, (err) => {
      // Cleanup temp dir
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      if (err) {
        console.error('Backup download error:', err);
      }
    });
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multer for backup import
const backupStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureDir(BACKUP_DIR);
    cb(null, BACKUP_DIR);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${Date.now()}-${safe}`);
  }
});
const backupUpload = multer({ storage: backupStorage });

// Import backup: restore db and assets
app.post('/api/backup/import', backupUpload.single('archive'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arşiv dosyası gerekli' });
    }
    const uploaded = req.file.path;
    const extractDir = path.join(tmpBase, `restore-${Date.now()}`);
    ensureDir(extractDir);
    // Extract tar.gz
    execSync(`tar -xzf "${uploaded}" -C "${extractDir}"`);
    // Replace DB
    const extractedDb = path.join(extractDir, 'crm.db');
    if (fs.existsSync(extractedDb)) {
      const dbTarget = path.join(process.cwd(), 'crm.db');
      fs.cpSync(extractedDb, dbTarget, { recursive: false });
    }
    // Replace assets
    const extractedImg = path.join(extractDir, 'img');
    const extractedDoc = path.join(extractDir, 'doc');
    const imgTarget = path.join(process.cwd(), 'server', 'img');
    const docTarget = path.join(process.cwd(), 'server', 'doc');
    if (fs.existsSync(extractedImg)) {
      // Clean and copy
      try { fs.rmSync(imgTarget, { recursive: true, force: true }); } catch {}
      fs.cpSync(extractedImg, imgTarget, { recursive: true });
    }
    if (fs.existsSync(extractedDoc)) {
      try { fs.rmSync(docTarget, { recursive: true, force: true }); } catch {}
      fs.cpSync(extractedDoc, docTarget, { recursive: true });
    }
    // Cleanup
    try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch {}
    // Advise restart (nodemon will pick up exit)
    res.json({ success: true, message: 'Yedek geri yüklendi. Sunucu yeniden başlatılacak.' });
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error('Backup import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset Data Endpoint
app.post('/api/reset-data', (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'SIFIRLA') {
      return res.status(400).json({ error: 'Geçersiz onay kodu.' });
    }

    // List of tables to clear
    const tablesToClear = [
      'shifts',      // Has orderId, machineId
      'orders',      // Has customerId
      'stock_items', // Has productId
      'products',
      // 'customers', // KORUNDU: Kullanıcı isteği üzerine müşteriler silinmeyecek
      'machines',
              // 'personnel', // KORUNDU: Kullanıcı isteği üzerine personel/kullanıcılar silinmeyecek
              'weekly_plans',
              'monthly_plans'
              // 'company_settings' // KORUNDU: Firma bilgileri silinmeyecek
            ];

    // Execute deletions in a transaction with FK checks disabled
    const deleteTransaction = db.transaction(() => {
      // Disable Foreign Key constraints temporarily to allow mass deletion without order issues
      db.prepare('PRAGMA foreign_keys = OFF').run();
      
      try {
        for (const table of tablesToClear) {
          db.prepare(`DELETE FROM ${table}`).run();
        }
        // NOTE: product_molds, users, roles, personnel, customers, and company_settings tables are EXPLICITLY EXCLUDED from deletion.
      } finally {
        // Re-enable Foreign Key constraints
        db.prepare('PRAGMA foreign_keys = ON').run();
      }
    });

    deleteTransaction();

    // Clear uploaded files (keep directories)
    const imgDir = path.join(process.cwd(), 'server', 'img');
    const docDir = path.join(process.cwd(), 'server', 'doc');

    const clearDirectory = (directory, excludeList = []) => {
      if (fs.existsSync(directory)) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
          if (excludeList.includes(file)) continue; // Skip excluded files/folders

          const filePath = path.join(directory, file);
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
          } catch (e) {
            console.error(`Failed to delete ${filePath}:`, e);
          }
        }
      }
    };

    // 'company' folder must be preserved in imgDir
    clearDirectory(imgDir, ['company']);
    clearDirectory(docDir);

    res.json({ success: true, message: 'Veriler ve dosyalar başarıyla sıfırlandı.' });
  } catch (error) {
    console.error('Reset data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seed Data Endpoint
app.post('/api/seed-data', (req, res) => {
  try {
    const seedTransaction = db.transaction(() => {
      // 1. Generate Customers (10)
      const customers = [];
      const customerNames = [
        'Yıldız Ambalaj', 'Demir Lojistik', 'Akdeniz Gıda', 'Ege Tekstil', 
        'Marmara Yapı', 'Anadolu Tarım', 'Karadeniz Nakliyat', 'Güneş Plastik', 
        'Ay Metal', 'Deniz Kimya'
      ];

      const insertCustomer = db.prepare(`
        INSERT INTO customers (id, companyName, contactName, email, phone, mobile, address, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 10; i++) {
        const id = crypto.randomUUID();
        const company = customerNames[i];
        const contact = `Yetkili ${i+1}`;
        const email = `info@${company.toLowerCase().replace(/\s+/g, '')}.com`.replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
        
        insertCustomer.run(
          id,
          company,
          contact,
          email,
          `0212 555 00 0${i}`,
          `0532 555 00 0${i}`,
          `İstanbul Organize Sanayi Bölgesi, No: ${i+1}`,
          new Date().toISOString()
        );
        customers.push({ id, company });
      }

      // 2. Generate Products (5)
      const products = [];
      const productTypes = [
        { code: 'PRD-001', desc: 'Standart Kutu 20x20x10', dim: { length: 20, width: 20, height: 10 } },
        { code: 'PRD-002', desc: 'Büyük Koli 50x40x30', dim: { length: 50, width: 40, height: 30 } },
        { code: 'PRD-003', desc: 'Pizza Kutusu 30x30x4', dim: { length: 30, width: 30, height: 4 } },
        { code: 'PRD-004', desc: 'Hediye Kutusu 15x15x15', dim: { length: 15, width: 15, height: 15 } },
        { code: 'PRD-005', desc: 'Dosya Klasörü', dim: { length: 25, width: 5, height: 35 } },
      ];

      const insertProduct = db.prepare(`
        INSERT INTO products (id, code, description, dimensions, features, details, windowDetails, lidDetails, images, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of productTypes) {
        const id = crypto.randomUUID();
        insertProduct.run(
          id,
          p.code,
          p.desc,
          JSON.stringify(p.dim),
          JSON.stringify({ material: 'Kraft', flute: 'E' }),
          'Test ürünü detay açıklaması.',
          JSON.stringify({ type: 'None' }),
          JSON.stringify({ type: 'Standard' }),
          JSON.stringify([]),
          new Date().toISOString()
        );
        products.push({ id, ...p });
      }

      // 3. Generate Orders (15)
      const statuses = [
        'created', 'offer_sent', 'offer_accepted', 
        'design_waiting', 'design_approved', 
        'supply_waiting', 'supply_completed',
        'production_planned', 'production_started', 'production_completed',
        'invoice_waiting', 'invoice_added',
        'shipping_waiting', 'shipping_completed',
        'order_completed'
      ];

      const insertOrder = db.prepare(`
        INSERT INTO orders (id, customerId, customerName, items, currency, subtotal, vatTotal, grandTotal, status, designImages, deadline, createdAt, procurementStatus, productionStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 15; i++) {
        const id = crypto.randomUUID();
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 5000) + 100;
        const price = (Math.random() * 10) + 1;
        const total = quantity * price;
        
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Determine sub-statuses based on main status
        let procurement = 'Beklemede';
        let production = 'Beklemede';
        
        if (['production_started', 'production_completed', 'shipping_completed', 'order_completed'].includes(status)) {
          procurement = 'Tamamlandı';
          production = status === 'production_started' ? 'Devam Ediyor' : 'Tamamlandı';
        } else if (status === 'production_planned') {
          procurement = 'Devam Ediyor';
        }

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + Math.floor(Math.random() * 30));

        insertOrder.run(
          id,
          customer.id,
          customer.company,
          JSON.stringify([{
            productId: product.id,
            productCode: product.code,
            productName: product.desc,
            quantity: quantity,
            unitPrice: parseFloat(price.toFixed(2)),
            totalPrice: parseFloat(total.toFixed(2)),
            currency: 'TRY'
          }]),
          'TRY',
          parseFloat(total.toFixed(2)),
          parseFloat((total * 0.20).toFixed(2)),
          parseFloat((total * 1.20).toFixed(2)),
          status,
          JSON.stringify([]),
          deadline.toISOString().split('T')[0],
          new Date().toISOString(),
          procurement,
          production
        );
      }
    });

    seedTransaction();
    res.json({ success: true, message: 'Test verileri başarıyla oluşturuldu.' });
  } catch (error) {
    console.error('Seed data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- NOTIFICATIONS ---

const createNotification = ({ userId, roleId, title, message, type, relatedId }) => {
  try {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO notifications (id, userId, roleId, title, message, type, relatedId, isRead, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    stmt.run(id, userId || null, roleId || null, title, message, type || 'info', relatedId || null, new Date().toISOString());
    return id;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

app.get('/api/notifications', (req, res) => {
  try {
    const { userId, roleId } = req.query;
    
    let query = 'SELECT * FROM notifications WHERE isRead = 0 AND (';
    const params = [];
    
    // Logic: User sees notifications for their ID OR their Role OR global (both null? maybe not)
    // Actually, let's keep it simple: 
    // IF userId provided -> match userId
    // IF roleId provided -> match roleId
    
    const conditions = [];
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }
    if (roleId) {
      conditions.push('roleId = ?');
      params.push(roleId);
    }
    
    if (conditions.length === 0) {
      return res.json([]);
    }
    
    query += conditions.join(' OR ') + ') ORDER BY createdAt DESC';
    
    const stmt = db.prepare(query);
    const notifications = stmt.all(...params);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/mark-read', (req, res) => {
  try {
    const { ids } = req.body; // Array of IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`UPDATE notifications SET isRead = 1 WHERE id IN (${placeholders})`);
    stmt.run(...ids);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PLANNING ---

// MONTHLY PLANS
app.get('/api/planning/monthly', (req, res) => {
  try {
    const { month, year } = req.query;
    if (month === undefined || year === undefined) {
      // Return all if no filter (or limit?)
      const stmt = db.prepare('SELECT * FROM monthly_plans ORDER BY year DESC, month DESC');
      const plans = stmt.all();
      const parsedPlans = plans.map(p => ({
        ...p,
        planData: JSON.parse(p.planData)
      }));
      return res.json(parsedPlans);
    }

    const stmt = db.prepare('SELECT * FROM monthly_plans WHERE month = ? AND year = ?');
    const plan = stmt.get(month, year);
    
    if (plan) {
      plan.planData = JSON.parse(plan.planData);
      res.json(plan);
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/planning/monthly', (req, res) => {
  try {
    const { month, year, planData } = req.body;
    
    // Check if exists
    const checkStmt = db.prepare('SELECT id FROM monthly_plans WHERE month = ? AND year = ?');
    const existing = checkStmt.get(month, year);

    if (existing) {
      // Update
      const updateStmt = db.prepare(`
        UPDATE monthly_plans 
        SET planData = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(planData), existing.id);
      res.json({ success: true, id: existing.id });
    } else {
      // Insert
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT INTO monthly_plans (id, month, year, planData, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertStmt.run(id, month, year, JSON.stringify(planData), createdAt);
      res.json({ success: true, id });
    }
  } catch (error) {
    console.error('Monthly plan saving error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WEEKLY PLANS (Keep for backward compatibility or reference if needed)
app.get('/api/planning/weekly', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM weekly_plans ORDER BY weekStartDate DESC');
    const plans = stmt.all();
    const parsedPlans = plans.map(p => ({
      ...p,
      planData: JSON.parse(p.planData)
    }));
    res.json(parsedPlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/planning/weekly', (req, res) => {
  try {
    const { weekStartDate, weekEndDate, planData } = req.body;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO weekly_plans (id, weekStartDate, weekEndDate, planData, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, weekStartDate, weekEndDate, JSON.stringify(planData), createdAt);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Plan saving error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/planning/weekly/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { planData } = req.body;
    
    const stmt = db.prepare(`
      UPDATE weekly_plans 
      SET planData = ?
      WHERE id = ?
    `);
    
    stmt.run(JSON.stringify(planData), id);
    res.json({ success: true });
  } catch (error) {
    console.error('Plan update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/planning/weekly/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM weekly_plans WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STOCK ITEMS ---

app.get('/api/stock-items', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM stock_items ORDER BY createdAt DESC');
    const items = stmt.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stock-items', (req, res) => {
  try {
    const { id, stockNumber, company, product, quantity, unit, category, notes, minLimit, purchasePrice, date, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO stock_items (id, stockNumber, company, product, quantity, unit, category, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Note: minLimit, purchasePrice, date are not in the schema yet based on db.js, 
    // but category IS in the schema. 
    // Wait, let me check db.js again for notes. Yes, notes is there.
    stmt.run(id, stockNumber, company, product, quantity, unit, category, notes, createdAt);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stock-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM stock_items WHERE id = ?');
    stmt.run(id);
    res.json({ message: 'Stock item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/stock-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if it's a deduct/add operation (legacy support)
    if (updates.deduct !== undefined) {
      const stmt = db.prepare('UPDATE stock_items SET quantity = quantity - ? WHERE id = ?');
      stmt.run(updates.deduct, id);
    } else if (updates.quantity !== undefined && Object.keys(updates).length === 1) {
       // Simple quantity set
       const stmt = db.prepare('UPDATE stock_items SET quantity = ? WHERE id = ?');
       stmt.run(updates.quantity, id);
    } else {
      // General update for any field
      // Remove 'deduct' if it exists to avoid trying to update a non-existent column
      const { deduct, ...fieldsToUpdate } = updates;
      
      const fields = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(fieldsToUpdate), id];
      
      if (fields.length > 0) {
        const stmt = db.prepare(`UPDATE stock_items SET ${fields} WHERE id = ?`);
        stmt.run(...values);
      }
    }
    
    const updatedItem = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id);
    if (!updatedItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMERS ---

app.get('/api/customers', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM customers ORDER BY companyName ASC');
    const customers = stmt.all();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { id, companyName, contactName, email, phone, mobile, address, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO customers (id, companyName, contactName, email, phone, mobile, address, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, companyName, contactName, email, phone, mobile, address, createdAt);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE customers SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PRODUCTS ---

const parseProduct = (product) => {
  if (!product) return null;
  return {
    ...product,
    dimensions: JSON.parse(product.dimensions || '{}'),
    features: JSON.parse(product.features || '{}'),
    windowDetails: product.windowDetails ? JSON.parse(product.windowDetails) : undefined,
    lidDetails: product.lidDetails ? JSON.parse(product.lidDetails) : undefined,
    images: product.images ? JSON.parse(product.images) : undefined,
    inks: product.inks ? JSON.parse(product.inks) : undefined,
  };
};

app.get('/api/products', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products ORDER BY createdAt DESC');
    const products = stmt.all();
    const parsedProducts = products.map(parseProduct);
    res.json(parsedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { 
      id, name, productType, boxShape, dimensions, features, 
      details, windowDetails, lidDetails, images, inks, createdAt 
    } = req.body;

    // Generate Auto Increment Code
    const products = db.prepare("SELECT code FROM products WHERE code LIKE 'GMP%'").all();
    let maxNum = 0;
    for (const p of products) {
      const numPart = parseInt(p.code.replace('GMP', ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
    const newCode = `GMP${String(maxNum + 1).padStart(2, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO products (
        id, code, name, productType, boxShape, dimensions, features, 
        details, windowDetails, lidDetails, images, inks, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, 
      newCode, 
      name,
      productType,
      boxShape, 
      JSON.stringify(dimensions), 
      JSON.stringify(features), 
      details, 
      windowDetails ? JSON.stringify(windowDetails) : null, 
      lidDetails ? JSON.stringify(lidDetails) : null, 
      images ? JSON.stringify(images) : null, 
      inks ? JSON.stringify(inks) : null,
      createdAt
    );
    res.status(201).json({ ...req.body, code: newCode });
  } catch (error) {
    console.error('POST /products error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // JSON fields handling
    const jsonFields = ['dimensions', 'features', 'windowDetails', 'lidDetails', 'images', 'inks'];
    jsonFields.forEach(field => {
      if (updates[field]) {
        updates[field] = JSON.stringify(updates[field]);
      }
    });

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE products SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(parseProduct(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers/:id/products', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all orders for this customer to find their products
    const orders = db.prepare('SELECT items FROM orders WHERE customerId = ?').all(id);
    
    const productIds = new Set();
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        items.forEach(item => {
          if (item.productId) productIds.add(item.productId);
        });
      } catch (e) {
        // Ignore parse errors
      }
    });

    if (productIds.size === 0) {
      return res.json([]);
    }

    const placeholders = [...productIds].map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`);
    const products = stmt.all(...productIds);
    
    const parsedProducts = products.map(parseProduct);
    res.json(parsedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ORDERS ---

const parseOrder = (order) => {
  if (!order) return null;
  
  let items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch (e) {
    console.error(`Error parsing items for order ${order.id}:`, e);
    items = [];
  }

  let designImages = [];
  try {
    designImages = order.designImages ? JSON.parse(order.designImages) : [];
  } catch (e) {
    console.error(`Error parsing designImages for order ${order.id}:`, e);
    designImages = [];
  }

  let stockUsage = {};
  try {
    stockUsage = order.stockUsage ? JSON.parse(order.stockUsage) : {};
  } catch (e) {
    console.error(`Error parsing stockUsage for order ${order.id}:`, e);
    stockUsage = {};
  }

  return {
    ...order,
    items,
    designImages,
    stockUsage
  };
};

app.get('/api/orders', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC');
    const orders = stmt.all();
    const parsedOrders = orders.map(parseOrder);
    res.json(parsedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { 
      id, customerId, customerName, items, currency, 
      subtotal, vatTotal, grandTotal, status, designImages, deadline, createdAt,
      assignedUserId, assignedUserName, assignedRoleName,
      paymentMethod, maturityDays,
      prepaymentAmount, prepaymentRate,
      gofrePrice, gofreVatRate, shippingPrice, shippingVatRate,
      gofreQuantity, gofreUnitPrice
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO orders (
        id, customerId, customerName, items, currency, 
        subtotal, vatTotal, grandTotal, status, designImages, deadline, createdAt,
        assignedUserId, assignedUserName, assignedRoleName,
        paymentMethod, maturityDays,
        prepaymentAmount, prepaymentRate,
        gofrePrice, gofreVatRate, shippingPrice, shippingVatRate,
        gofreQuantity, gofreUnitPrice
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, 
      customerId, 
      customerName, 
      JSON.stringify(items), 
      currency, 
      subtotal, 
      vatTotal, 
      grandTotal, 
      status, 
      designImages ? JSON.stringify(designImages) : null,
      deadline, 
      createdAt,
      assignedUserId || null,
      assignedUserName || null,
      assignedRoleName || null,
      paymentMethod || null,
      maturityDays || null,
      prepaymentAmount || null,
      prepaymentRate || null,
      gofrePrice || null,
      gofreVatRate || null,
      shippingPrice || null,
      shippingVatRate || null,
      gofreQuantity || null,
      gofreUnitPrice || null
    );
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    
    // Notification Logic for Assignment
    if (updates.assignedUserId && updates.assignedUserId !== current.assignedUserId) {
      createNotification({
        userId: updates.assignedUserId,
        title: 'Yeni İş Ataması',
        message: `Sipariş #${id.slice(0,8)} (${current.customerName}) size atandı.`,
        type: 'task',
        relatedId: id
      });
    } else if (updates.assignedRoleName && updates.assignedRoleName !== current.assignedRoleName) {
       // Try to find role ID
       const role = db.prepare('SELECT id FROM roles WHERE name = ?').get(updates.assignedRoleName);
       if (role) {
         createNotification({
            roleId: role.id,
            title: 'Departman İş Ataması',
            message: `Sipariş #${id.slice(0,8)} (${current.customerName}) departmanınıza atandı.`,
            type: 'task',
            relatedId: id
         });
       }
    }

    // Automatic Notification based on Status Change (Workflow Handoffs)
    if (updates.status && updates.status !== current.status) {
        let targetRoleName = '';
        let notifTitle = '';
        let notifMessage = '';

        switch (updates.status) {
            case 'offer_accepted':
                // Legacy support if needed, but we now move to supply_design_process
                targetRoleName = 'Tasarımcı';
                notifTitle = 'Yeni Tasarım İş Emri';
                notifMessage = `Sipariş #${id.slice(0,8)} için tasarım onayı bekleniyor.`;
                break;
            case 'supply_design_process':
                // Notify Designer
                const designRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Tasarımcı');
                if (designRole) {
                    createNotification({
                    roleId: designRole.id,
                    title: 'Yeni Tasarım İş Emri',
                    message: `Sipariş #${id.slice(0,8)} için işlem bekleniyor.`,
                    type: 'task',
                    relatedId: id
                    });
                }
                
                // Notify Procurement
                let supplyRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Tedarik');
                if (!supplyRole) supplyRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('Matbaa');
                
                if (supplyRole) {
                    createNotification({
                    roleId: supplyRole.id,
                    title: 'Yeni Tedarik İş Emri',
                    message: `Sipariş #${id.slice(0,8)} için işlem bekleniyor.`,
                    type: 'task',
                    relatedId: id
                    });
                }
                break;
            case 'design_approved':
                targetRoleName = 'Tedarik'; // Or 'Matbaa' depending on setup, user said 'Tedarik'
                notifTitle = 'Hammadde Tedarik Talebi';
                notifMessage = `Sipariş #${id.slice(0,8)} için malzeme tedariği bekleniyor.`;
                break;
            case 'supply_completed':
                targetRoleName = 'Fabrika Müdürü'; // Assuming Production Manager
                notifTitle = 'Üretim Planlama Talebi';
                notifMessage = `Sipariş #${id.slice(0,8)} için hammadde hazır, üretim planlanmalı.`;
                break;
            case 'production_completed':
                targetRoleName = 'Muhasebe';
                notifTitle = 'Fatura/İrsaliye Talebi';
                notifMessage = `Sipariş #${id.slice(0,8)} üretimi tamamlandı, evrak bekleniyor.`;
                break;
            case 'invoice_added':
                targetRoleName = 'Sevkiyat';
                notifTitle = 'Sevkiyat Talebi';
                notifMessage = `Sipariş #${id.slice(0,8)} evrakları hazır, sevkiyat bekleniyor.`;
                break;
            case 'shipping_completed':
                targetRoleName = 'Admin'; // Or specific role for GM
                notifTitle = 'Sipariş Tamamlama Onayı';
                notifMessage = `Sipariş #${id.slice(0,8)} sevk edildi, kapatma onayı bekleniyor.`;
                break;
        }

        if (targetRoleName) {
            // Find Role ID
            // Special case for 'Admin' if it's not a role in DB but a specific user? 
            // Usually 'Admin' is a role or we send to all admins.
            // Let's assume 'Admin' role exists or we map to it.
            // If 'Admin' is not found, maybe check for 'Yönetici' or similar.
            let role = db.prepare('SELECT id FROM roles WHERE name = ?').get(targetRoleName);
            
            // Fallback for Supply if named differently (e.g. 'Matbaa' mentioned in Approvals.tsx)
            if (!role && targetRoleName === 'Tedarik') {
                 role = db.prepare('SELECT id FROM roles WHERE name = ?').get('Matbaa');
            }
            // Fallback for Production if named differently
            if (!role && targetRoleName === 'Fabrika Müdürü') {
                 role = db.prepare('SELECT id FROM roles WHERE name = ?').get('Üretim');
            }

            if (role) {
                createNotification({
                    roleId: role.id,
                    title: notifTitle,
                    message: notifMessage,
                    type: 'task',
                    relatedId: id
                });
            } else if (targetRoleName === 'Admin') {
                // If no role found, maybe send to all admin users?
                // For now, let's skip if no specific role.
                // Or hardcode to a specific role if we know it.
            }
        }
    }

    if (updates.items) {
      updates.items = JSON.stringify(updates.items);
    }
    if (updates.designImages) {
      updates.designImages = JSON.stringify(updates.designImages);
    }
    if (updates.stockUsage) {
      updates.stockUsage = JSON.stringify(updates.stockUsage);
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE orders SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    // Shipping completed -> deduct finished stock
    try {
      const prevStatus = current?.status;
      const newStatus = updated?.status;
      if (prevStatus !== 'shipping_completed' && newStatus === 'shipping_completed') {
        const parsedUpdated = parseOrder(updated);
        const items = parsedUpdated.items || [];
        const insertStock = db.prepare(`
          INSERT INTO stock_items (id, stockNumber, company, product, quantity, unit, category, productId, notes, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        items.forEach(item => {
          insertStock.run(
            `${Date.now()}-${Math.random()}`,
            `SHIP-${parsedUpdated.id}-${Date.now()}`,
            parsedUpdated.customerName || 'Sevkiyat',
            item.productName,
            -Math.abs(item.quantity),
            'adet',
            'finished',
            item.productId || null,
            'Sevkiyat ile stoktan düşüş',
            new Date().toISOString()
          );
        });
      }
    } catch (e) {
      console.error('Stock deduction on shipping error:', e);
    }
    res.json(parseOrder(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PERSONNEL ---

app.get('/api/personnel', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM personnel ORDER BY createdAt DESC');
    const items = stmt.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/personnel', (req, res) => {
  try {
    const { id, firstName, lastName, role, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO personnel (id, firstName, lastName, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, firstName, lastName, role, createdAt);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/personnel/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM personnel WHERE id = ?');
    stmt.run(id);
    res.json({ message: 'Personnel deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MACHINES ---

app.get('/api/machines', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM machines ORDER BY createdAt DESC');
    const items = stmt.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/machines', (req, res) => {
  try {
    const { id, machineNumber, features, maintenanceInterval, lastMaintenance, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO machines (id, machineNumber, features, maintenanceInterval, lastMaintenance, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, machineNumber, features, maintenanceInterval, lastMaintenance, createdAt);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/machines/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM machines WHERE id = ?');
    stmt.run(id);
    res.json({ message: 'Machine deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SHIFTS ---

const parseShift = (shift) => {
  if (!shift) return null;
  return {
    ...shift,
    personnelIds: JSON.parse(shift.personnelIds || '[]')
  };
};

app.get('/api/shifts', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM shifts ORDER BY createdAt DESC');
    const shifts = stmt.all();
    res.json(shifts.map(parseShift));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shifts', (req, res) => {
  try {
    const { 
      id, orderId, machineId, supervisorId, personnelIds, 
      startTime, endTime, plannedQuantity, producedQuantity, scrapQuantity, 
      status, createdAt 
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO shifts (
        id, orderId, machineId, supervisorId, personnelIds, 
        startTime, endTime, plannedQuantity, producedQuantity, scrapQuantity, 
        status, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, orderId, machineId, supervisorId, 
      JSON.stringify(personnelIds), 
      startTime, endTime, plannedQuantity, 
      producedQuantity || 0, scrapQuantity || 0, 
      status || 'planned', createdAt
    );
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/shifts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.personnelIds) {
      updates.personnelIds = JSON.stringify(updates.personnelIds);
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE shifts SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
    res.json(parseShift(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/shifts/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM shifts WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- AUTH & USERS ---

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare(`
      SELECT u.*, r.name as roleName, r.permissions 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      WHERE u.username = ? AND u.password = ?
    `).get(username, password);

    if (!user) {
      const ipAddress = getClientIp(req);
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO login_logs (id, userId, username, fullName, roleId, roleName, ipAddress, userAgent, isSuccess, message, loginAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        null,
        username || null,
        null,
        null,
        null,
        ipAddress,
        req.headers['user-agent'] || null,
        0,
        'Invalid credentials',
        new Date().toISOString()
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      const ipAddress = getClientIp(req);
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO login_logs (id, userId, username, fullName, roleId, roleName, ipAddress, userAgent, isSuccess, message, loginAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user.id,
        user.username,
        user.fullName,
        user.roleId,
        user.roleName,
        ipAddress,
        req.headers['user-agent'] || null,
        0,
        'User account is inactive',
        new Date().toISOString()
      );
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Parse permissions
    const userData = {
      ...user,
      permissions: JSON.parse(user.permissions || '[]'),
    };
    delete userData.password;

    const ipAddress = getClientIp(req);
    const loginLogId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO login_logs (id, userId, username, fullName, roleId, roleName, ipAddress, userAgent, isSuccess, message, loginAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      loginLogId,
      user.id,
      user.username,
      user.fullName,
      user.roleId,
      user.roleName,
      ipAddress,
      req.headers['user-agent'] || null,
      1,
      'Login successful',
      new Date().toISOString()
    );

    res.json({ ...userData, loginLogId });
  } catch (error) {
    logError(req, error, { context: 'auth_login', username: req.body?.username });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const { loginLogId } = req.body || {};
    if (!loginLogId) {
      return res.status(400).json({ error: 'loginLogId gerekli' });
    }

    const existing = db.prepare('SELECT loginAt FROM login_logs WHERE id = ?').get(loginLogId);
    if (!existing) {
      return res.status(404).json({ error: 'Oturum kaydı bulunamadı' });
    }

    const logoutAt = new Date();
    const loginAtDate = new Date(existing.loginAt);
    const durationSeconds = Math.max(0, Math.floor((logoutAt.getTime() - loginAtDate.getTime()) / 1000));

    db.prepare(`
      UPDATE login_logs
      SET logoutAt = ?, durationSeconds = ?
      WHERE id = ?
    `).run(
      logoutAt.toISOString(),
      durationSeconds,
      loginLogId
    );

    res.json({ success: true });
  } catch (error) {
    logError(req, error, { context: 'auth_logout' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.fullName, u.roleId, u.isActive, u.createdAt, r.name as roleName 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      ORDER BY u.createdAt DESC
    `).all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { id, username, password, roleId, fullName, isActive, createdAt } = req.body;
    
    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const stmt = db.prepare(`
      INSERT INTO users (id, username, password, roleId, fullName, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, username, password, roleId, fullName, isActive, createdAt);
    
    const newUser = db.prepare('SELECT id, username, fullName, roleId, isActive, createdAt FROM users WHERE id = ?').get(id);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that strictly shouldn't be updated or don't exist in the table
    delete updates.roleName; // Derived field from join
    delete updates.id; // Primary key
    delete updates.createdAt; // Creation timestamp
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare(`
      SELECT u.id, u.username, u.fullName, u.roleId, u.isActive, u.createdAt, r.name as roleName 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      WHERE u.id = ?
    `).get(id);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logs/actions', (req, res) => {
  try {
    const {
      userId,
      username,
      fullName,
      roleId,
      roleName,
      path: pathValue,
      type,
      payload,
      createdAt,
    } = req.body || {};

    const id = crypto.randomUUID();
    const ipAddress = getClientIp(req);

    db.prepare(`
      INSERT INTO user_actions (id, userId, username, fullName, roleId, roleName, ipAddress, path, actionType, payload, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId || null,
      username || null,
      fullName || null,
      roleId || null,
      roleName || null,
      ipAddress,
      pathValue || null,
      type || 'unknown',
      payload ? JSON.stringify(payload) : null,
      createdAt || new Date().toISOString()
    );

    res.json({ success: true });
  } catch (error) {
    logError(req, error, { context: 'log_action' });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logs/error', (req, res) => {
  try {
    const {
      userId,
      username,
      path: pathValue,
      message,
      stack,
      context,
    } = req.body || {};

    const id = crypto.randomUUID();
    const ipAddress = getClientIp(req);
    const contextJson = context ? JSON.stringify(context) : null;

    db.prepare(`
      INSERT INTO error_logs (id, userId, username, path, method, ipAddress, message, stack, context, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId || null,
      username || null,
      pathValue || req.path,
      req.method,
      ipAddress,
      message || 'Frontend error',
      stack || null,
      contextJson,
      new Date().toISOString()
    );

    res.json({ success: true });
  } catch (error) {
    logError(req, error, { context: 'log_error' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/login', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const stmt = db.prepare(`
      SELECT *
      FROM login_logs
      ORDER BY datetime(loginAt) DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    res.json(rows);
  } catch (error) {
    logError(req, error, { context: 'get_login_logs' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/actions', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const stmt = db.prepare(`
      SELECT *
      FROM user_actions
      ORDER BY datetime(createdAt) DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    res.json(rows);
  } catch (error) {
    logError(req, error, { context: 'get_action_logs' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/errors', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const stmt = db.prepare(`
      SELECT *
      FROM error_logs
      ORDER BY datetime(createdAt) DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit);
    res.json(rows);
  } catch (error) {
    logError(req, error, { context: 'get_error_logs' });
    res.status(500).json({ error: error.message });
  }
});

// --- ROLES ---

app.get('/api/roles', (req, res) => {
  try {
    const roles = db.prepare('SELECT * FROM roles ORDER BY createdAt DESC').all();
    const parsedRoles = roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]')
    }));
    res.json(parsedRoles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/roles', (req, res) => {
  try {
    const { id, name, permissions, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO roles (id, name, permissions, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, name, JSON.stringify(permissions), createdAt);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.permissions) {
      updates.permissions = JSON.stringify(updates.permissions);
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE roles SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    res.json({
      ...updated,
      permissions: JSON.parse(updated.permissions || '[]')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/roles/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM roles WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PRODUCT MOLDS ---

// Varsayılan kalıp ölçüleri (kullanıcının verdiği tüm ölçüler)
const DEFAULT_MOLDS = [
  // Perçinli Kare
  ...['55x55','75x75','85x85','90x90','100x100','120x120','155x155','190x190','215x215','235x235'].map(d => ({ productType: 'percinli', boxShape: 'Kare', dimensions: d })),
  // Perçinli Oval
  ...['60x70','83x103','143x232','200x300'].map(d => ({ productType: 'percinli', boxShape: 'Oval', dimensions: d })),
  // Perçinli Sekizgen
  ...['85x110','220x220','190x275'].map(d => ({ productType: 'percinli', boxShape: 'Sekizgen', dimensions: d })),
  // Perçinli Dikdörtgen
  ...['45x65','80x120','80x140','90x150','100x75','100x130','110x150','115x190','135x190','140x240','155x195','170x260','180x225','180x240','215x235','200x300'].map(d => ({ productType: 'percinli', boxShape: 'Dikdörtgen', dimensions: d })),
  // Perçinli Yuvarlak (etiket: Ø)
  ...[42, 52, 55, 65, 69, 73, 82, 85, 90, 99, 105, 108, 120, 140, 153, 160, 175, 190, 200, 215, 240, 265].map(d => ({ productType: 'percinli', boxShape: 'Yuvarlak', dimensions: String(d), label: `Ø${d}` })),
  // Perçinli Kalpli
  ...['90x90','90x90x25','205x190x40','235x235'].map(d => ({ productType: 'percinli', boxShape: 'Kalpli', dimensions: d })),
  // Perçinli Tepsi
  { productType: 'percinli', boxShape: 'Tepsi', dimensions: '304x234', label: '304x234' },
  { productType: 'percinli', boxShape: 'Tepsi', dimensions: '357x272', label: '357x272' },
  { productType: 'percinli', boxShape: 'Tepsi', dimensions: '362x245', label: '362x245 (Dalgalı)' },
  { productType: 'percinli', boxShape: 'Tepsi', dimensions: '315x215', label: '315x215' },
  { productType: 'percinli', boxShape: 'Tepsi', dimensions: '400x400', label: 'Ø400' },
  // Perçinli Konik
  ...['130x165x160','130x165x140','90x120x105'].map(d => ({ productType: 'percinli', boxShape: 'Konik', dimensions: d })),
  // Sıvama Standart
  ...['90x90x30 - Kalp Şekilli','205x190x40 - Kalp Şekilli','75x205x25','65x205x25 - Fermuarlı','105x205x25 - Fermuarlı','135x200x25 - Fermuarlı','175x215x45','90x80x15','90x80x30','100x100x30','105x105x40','97x58x20','94x58x20','95x120x22','69x45','85x40','99x30','105x40 - Expanded','132x45 - Expanded','O115 - Bardak Altlığı'].map(d => ({ productType: 'sivama', boxShape: 'Standart', dimensions: d })),
];

// Ensure default molds exist (Seed if missing)
try {
  console.log('Checking default molds...');
  const existsStmt = db.prepare('SELECT 1 FROM product_molds WHERE productType = ? AND boxShape = ? AND dimensions = ? LIMIT 1');
  const insertStmt = db.prepare(`
    INSERT INTO product_molds (id, productType, boxShape, dimensions, label, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  
  const seedTransaction = db.transaction((molds) => {
    let inserted = 0;
    for (const m of molds) {
      if (!existsStmt.get(m.productType, m.boxShape, m.dimensions)) {
        insertStmt.run(crypto.randomUUID(), m.productType, m.boxShape, m.dimensions, m.label || null, now);
        inserted++;
      }
    }
    if (inserted > 0) {
      console.log(`Seeded ${inserted} missing default molds.`);
    } else {
      console.log('All default molds already exist.');
    }
  });
  
  seedTransaction(DEFAULT_MOLDS);
} catch (error) {
  console.error('Auto-seed molds error:', error);
}

// Varsayılan kalıpları veritabanına ekleyen endpoint (kayıt varsa atlar)
app.post('/api/molds/seed-defaults', (req, res) => {
  try {
    const existsStmt = db.prepare('SELECT 1 FROM product_molds WHERE productType = ? AND boxShape = ? AND dimensions = ? LIMIT 1');
    const insertStmt = db.prepare(`
      INSERT INTO product_molds (id, productType, boxShape, dimensions, label, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    let inserted = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    DEFAULT_MOLDS.forEach(m => {
      const has = existsStmt.get(m.productType, m.boxShape, m.dimensions);
      if (has) {
        skipped++;
        return;
      }
      insertStmt.run(crypto.randomUUID(), m.productType, m.boxShape, m.dimensions, m.label || null, now);
      inserted++;
    });
    res.json({ success: true, inserted, skipped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/molds', (req, res) => {
  try {
    const { productType, boxShape } = req.query;
    let query = 'SELECT * FROM product_molds';
    const params = [];
    const conditions = [];
    
    if (productType) {
      conditions.push('productType = ?');
      params.push(productType);
    }
    if (boxShape) {
      conditions.push('boxShape = ?');
      params.push(boxShape);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const stmt = db.prepare(query);
    const molds = stmt.all(...params);
    res.json(molds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/molds', (req, res) => {
  try {
    const { id, productType, boxShape, dimensions, label } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO product_molds (id, productType, boxShape, dimensions, label, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id || crypto.randomUUID(),
      productType,
      boxShape,
      dimensions,
      label || null,
      new Date().toISOString()
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/molds/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM product_molds WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
