

const API_URL = 'http://127.0.0.1:3005/api';


async function runTest() {
    console.log('Starting API Test...');

    try {
        // 1. Create Customer
        const customerRes = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: 'API Test Company ' + Date.now(),
                contactName: 'Test Contact',
                email: 'test@example.com',
                phone: '5551234567'
            })
        });
        const customer = await customerRes.json();
        console.log('Customer Created:', customer);
        if (!customer.id) throw new Error('Customer creation failed: ' + JSON.stringify(customer));

        // 2. Create Products
        const prod1Res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: 'P1',
                name: 'Product 1',
                productType: 'percinli',
                boxShape: 'Kare',
                dimensions: { length: 10, width: 10, depth: 10 },
                features: [],
                createdAt: new Date().toISOString()
            })
        });
        const prod1 = await prod1Res.json();
        console.log('Product 1 Created:', prod1.id);

        const prod2Res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: 'P2',
                name: 'Product 2',
                productType: 'sivama',
                boxShape: 'Oval',
                dimensions: { length: 20, width: 20, depth: 20 },
                features: [],
                createdAt: new Date().toISOString()
            })
        });
        const prod2 = await prod2Res.json();
        console.log('Product 2 Created:', prod2.id);

        // 3. Create Order with 2 Items
        const orderData = {
            customerId: customer.id,
            customerName: customer.companyName,
            currency: 'TRY',
            status: 'offer_sent',
            items: [
                {
                    id: 'item1',
                    productId: prod1.id,
                    productName: 'Product 1',
                    quantity: 100,
                    unitPrice: 10,
                    vatRate: 20,
                    total: 1200
                },
                {
                    id: 'item2',
                    productId: prod2.id,
                    productName: 'Product 2',
                    quantity: 50,
                    unitPrice: 20,
                    vatRate: 20,
                    total: 1200
                }
            ],
            subtotal: 2000,
            vatTotal: 400,
            grandTotal: 2400,
            gofrePrice: 0,
            shippingPrice: 0
        };

        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const order = await orderRes.json();
        console.log('Order Response:', JSON.stringify(order, null, 2));
        
        if (!order.id) {
            throw new Error('Order creation failed: ' + JSON.stringify(order));
        }
        console.log('Order Created:', order.id);

        // Verify Items
        if (order.items.length !== 2) {
            console.error('ERROR: Order has wrong number of items:', order.items.length);
        } else {
            const item1 = order.items.find(i => i.productId === prod1.id);
            const item2 = order.items.find(i => i.productId === prod2.id);
            
            if (item1 && item2) {
                console.log('SUCCESS: Both products present in created order.');
            } else {
                console.error('ERROR: Duplicate products or missing products in created order:', JSON.stringify(order.items, null, 2));
            }
        }

        // 4. Update order (simulate changing product)
        console.log('\n--- Updating Order (Changing Product) ---');
        const updateData = {
            items: [
                {
                    id: 'item1', // Keep same item ID
                    productId: prod2.id, // Change to Product 2
                    productName: 'Product 2 (Updated)',
                    quantity: 100,
                    unitPrice: 15,
                    vatRate: 20,
                    total: 1800
                }
            ],
            subtotal: 1800,
            vatTotal: 360,
            grandTotal: 2160
        };
        
        const updateRes = await fetch(`${API_URL}/orders/${order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!updateRes.ok) {
            throw new Error(`Update failed: ${updateRes.status} ${updateRes.statusText}`);
        }
        
        const updatedOrder = await updateRes.json();
        console.log('Order Updated:', updatedOrder.id);
        
        // 5. Verify persistence (Get Order)
        console.log('\n--- Verifying Persistence ---');
        const getRes = await fetch(`${API_URL}/orders/${order.id}`);
        if (!getRes.ok) {
            throw new Error(`Get failed: ${getRes.status} ${getRes.statusText}`);
        }
        const persistedOrder = await getRes.json();
        console.log('Persisted Order Items:', JSON.stringify(persistedOrder.items, null, 2));
        
        if (persistedOrder.items[0].productId !== prod2.id) {
            throw new Error('Persistence Check Failed: Product ID mismatch! Expected ' + prod2.id + ' but got ' + persistedOrder.items[0].productId);
        } else {
            console.log('SUCCESS: Product update persisted correctly.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

runTest();
