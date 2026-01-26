import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './db.js';

const app = express();
const PORT = 3000;

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

// Upload Endpoint
app.post('/upload', upload.single('image'), (req, res) => {
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

// --- STOCK ITEMS ---

app.get('/stock-items', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM stock_items ORDER BY createdAt DESC');
    const items = stmt.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/stock-items', (req, res) => {
  try {
    const { id, stockNumber, company, product, quantity, unit, createdAt } = req.body;
    const stmt = db.prepare(`
      INSERT INTO stock_items (id, stockNumber, company, product, quantity, unit, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, stockNumber, company, product, quantity, unit, createdAt);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/stock-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM stock_items WHERE id = ?');
    stmt.run(id);
    res.json({ message: 'Stock item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMERS ---

app.get('/customers', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM customers ORDER BY createdAt DESC');
    const customers = stmt.all();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/customers', (req, res) => {
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

app.patch('/customers/:id', (req, res) => {
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

app.delete('/customers/:id', (req, res) => {
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
  };
};

app.get('/products', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products ORDER BY createdAt DESC');
    const products = stmt.all();
    const parsedProducts = products.map(parseProduct);
    res.json(parsedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/products', (req, res) => {
  try {
    const { 
      id, code, description, dimensions, features, 
      details, windowDetails, lidDetails, images, createdAt 
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO products (
        id, code, description, dimensions, features, 
        details, windowDetails, lidDetails, images, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, 
      code, 
      description, 
      JSON.stringify(dimensions), 
      JSON.stringify(features), 
      details, 
      windowDetails ? JSON.stringify(windowDetails) : null, 
      lidDetails ? JSON.stringify(lidDetails) : null, 
      images ? JSON.stringify(images) : null, 
      createdAt
    );
    res.status(201).json(req.body);
  } catch (error) {
    console.error('POST /products error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // JSON fields handling
    const jsonFields = ['dimensions', 'features', 'windowDetails', 'lidDetails', 'images'];
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

app.delete('/products/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
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

  return {
    ...order,
    items,
    designImages
  };
};

app.get('/orders', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC');
    const orders = stmt.all();
    const parsedOrders = orders.map(parseOrder);
    res.json(parsedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/orders', (req, res) => {
  try {
    const { 
      id, customerId, customerName, items, currency, 
      subtotal, vatTotal, grandTotal, status, designImages, deadline, createdAt 
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO orders (
        id, customerId, customerName, items, currency, 
        subtotal, vatTotal, grandTotal, status, designImages, deadline, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      createdAt
    );
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.items) {
      updates.items = JSON.stringify(updates.items);
    }
    if (updates.designImages) {
      updates.designImages = JSON.stringify(updates.designImages);
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE orders SET ${fields} WHERE id = ?`);
      stmt.run(...values);
    }
    
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json(parseOrder(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/orders/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PERSONNEL ---

app.get('/personnel', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM personnel ORDER BY createdAt DESC');
    const items = stmt.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/personnel', (req, res) => {
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

app.delete('/personnel/:id', (req, res) => {
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

app.get('/machines', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM machines ORDER BY createdAt DESC');
    const items = stmt.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/machines', (req, res) => {
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

app.delete('/machines/:id', (req, res) => {
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

app.get('/shifts', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM shifts ORDER BY createdAt DESC');
    const shifts = stmt.all();
    res.json(shifts.map(parseShift));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/shifts', (req, res) => {
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

app.patch('/shifts/:id', (req, res) => {
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

app.delete('/shifts/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM shifts WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- AUTH & USERS ---

app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare(`
      SELECT u.*, r.name as roleName, r.permissions 
      FROM users u 
      LEFT JOIN roles r ON u.roleId = r.id 
      WHERE u.username = ? AND u.password = ?
    `).get(username, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Parse permissions
    const userData = {
      ...user,
      permissions: JSON.parse(user.permissions || '[]'),
      // Don't send password back
    };
    delete userData.password;

    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/users', (req, res) => {
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

app.post('/users', (req, res) => {
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

app.patch('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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

app.delete('/users/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROLES ---

app.get('/roles', (req, res) => {
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

app.post('/roles', (req, res) => {
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

app.patch('/roles/:id', (req, res) => {
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

app.delete('/roles/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM roles WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
