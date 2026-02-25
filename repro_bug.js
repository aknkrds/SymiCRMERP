
import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'crm.db');
console.log('Database Path:', dbPath);
const db = new Database(dbPath);

console.log('Testing Order Creation with Multiple Items...');

// 1. Create Test Customer
const customerId = 'TEST_CUST_' + Date.now();
try {
    const insertCustomer = db.prepare(`
        INSERT INTO customers (id, companyName, contactName, email, phone, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertCustomer.run(customerId, 'Test Company', 'Test Contact', 'test@test.com', '123456', new Date().toISOString());
    console.log('Customer created:', customerId);
} catch (error) {
    console.error('Customer creation failed:', error.message);
    process.exit(1);
}

// 2. Create Test Products
const prod1Id = 'PROD_1_' + Date.now();
const prod2Id = 'PROD_2_' + Date.now();

try {
    const insertProduct = db.prepare(`
        INSERT INTO products (id, code, name, productType, boxShape, dimensions, features, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Product 1
    insertProduct.run(
        prod1Id, 
        'CODE_A', 
        'Product A', 
        'percinli', 
        'Kare', 
        JSON.stringify({ length: 10, width: 10, depth: 10 }),
        JSON.stringify([]), 
        new Date().toISOString()
    );

    // Product 2
    insertProduct.run(
        prod2Id, 
        'CODE_B', 
        'Product B', 
        'sivama', 
        'Oval', 
        JSON.stringify({ length: 20, width: 20, depth: 20 }),
        JSON.stringify([]), 
        new Date().toISOString()
    );
    console.log('Products created:', prod1Id, prod2Id);
} catch (error) {
    console.error('Product creation failed:', error.message);
    process.exit(1);
}

// 3. Create Order with Multiple Items
const orderId = 'ORDER_' + Date.now();
const items = [
    {
        id: 'ITEM_1',
        productId: prod1Id,
        productName: 'Product A',
        quantity: 100,
        unitPrice: 10,
        vatRate: 20,
        total: 1200
    },
    {
        id: 'ITEM_2',
        productId: prod2Id,
        productName: 'Product B',
        quantity: 50,
        unitPrice: 20,
        vatRate: 20,
        total: 1200
    }
];

try {
    const insertOrder = db.prepare(`
        INSERT INTO orders (
            id, customerId, customerName, items, currency, subtotal, vatTotal, grandTotal, status, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
        orderId,
        customerId,
        'Test Company',
        JSON.stringify(items),
        'TRY',
        2000,
        400,
        2400,
        'created',
        new Date().toISOString()
    );
    console.log('Order created:', orderId);
} catch (error) {
    console.error('Order creation failed:', error.message);
    process.exit(1);
}

// 4. Verify Order Items
const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
const savedItems = JSON.parse(order.items);

console.log('Saved Items:', savedItems);

if (savedItems.length !== 2) {
    console.error('FAIL: Expected 2 items, got', savedItems.length);
} else if (savedItems[0].productId === savedItems[1].productId) {
    console.error('FAIL: Items are duplicates!');
} else {
    console.log('SUCCESS: Items saved correctly.');
}

// Cleanup
db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
db.prepare('DELETE FROM products WHERE id IN (?, ?)').run(prod1Id, prod2Id);
db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
