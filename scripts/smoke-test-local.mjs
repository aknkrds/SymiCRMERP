const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3005';

const req = async (path, { method = 'GET', body, headers } = {}) => {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      (json && (json.error || json.message)) ||
      text ||
      `${method} ${path} failed with ${res.status}`;
    const e = new Error(message);
    e.status = res.status;
    e.body = json || text;
    throw e;
  }

  return json;
};

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const nowIso = () => new Date().toISOString();

const run = async () => {
  const created = {
    customerId: null,
    productId: null,
    orderId: null,
    stockItemId: null,
    messageId: null,
    roleId: null,
    userId: null,
    weeklyPlanId: null,
  };

  const smoke = [];
  const step = async (name, fn) => {
    const startedAt = Date.now();
    try {
      await fn();
      smoke.push({ name, ok: true, ms: Date.now() - startedAt });
    } catch (e) {
      smoke.push({ name, ok: false, ms: Date.now() - startedAt, error: e.message });
      throw e;
    }
  };

  const cleanup = async () => {
    const safe = async (fn) => {
      try {
        await fn();
      } catch {}
    };

    await safe(async () => {
      if (created.messageId) await req(`/api/admin/messages/${created.messageId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.orderId) await req(`/api/orders/${created.orderId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.stockItemId) await req(`/api/stock-items/${created.stockItemId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.productId) await req(`/api/products/${created.productId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.customerId) await req(`/api/customers/${created.customerId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.weeklyPlanId) await req(`/api/planning/weekly/${created.weeklyPlanId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.userId) await req(`/api/users/${created.userId}`, { method: 'DELETE' });
    });
    await safe(async () => {
      if (created.roleId) await req(`/api/roles/${created.roleId}`, { method: 'DELETE' });
    });
  };

  try {
    await step('Health: customers list', async () => {
      const customers = await req('/api/customers');
      assert(Array.isArray(customers), 'customers should be array');
    });

    await step('Health: products list', async () => {
      const products = await req('/api/products');
      assert(Array.isArray(products), 'products should be array');
    });

    await step('Health: orders list', async () => {
      const orders = await req('/api/orders');
      assert(Array.isArray(orders), 'orders should be array');
    });

    await step('Health: stock list', async () => {
      const items = await req('/api/stock-items');
      assert(Array.isArray(items), 'stock-items should be array');
    });

    await step('Health: planning endpoints', async () => {
      const weekly = await req('/api/planning/weekly');
      assert(Array.isArray(weekly), 'weekly plans should be array');
      const monthly = await req('/api/planning/monthly');
      assert(Array.isArray(monthly) || monthly === null, 'monthly plans should be array or null');
    });

    await step('Health: molds endpoints', async () => {
      const molds = await req('/api/molds');
      assert(Array.isArray(molds), 'molds should be array');
    });

    await step('Health: settings endpoints', async () => {
      const roles = await req('/api/roles');
      assert(Array.isArray(roles), 'roles should be array');
      const users = await req('/api/users');
      assert(Array.isArray(users), 'users should be array');
      const company = await req('/api/company-settings');
      assert(company && typeof company === 'object', 'company-settings should be object');
      const loginLogs = await req('/api/logs/login');
      assert(Array.isArray(loginLogs), 'login logs should be array');
      const actionLogs = await req('/api/logs/actions');
      assert(Array.isArray(actionLogs), 'action logs should be array');
      const errorLogs = await req('/api/logs/errors');
      assert(Array.isArray(errorLogs), 'error logs should be array');
    });

    await step('CRUD: customer', async () => {
      const id = `smoke-cust-${crypto.randomUUID()}`;
      created.customerId = id;
      await req('/api/customers', {
        method: 'POST',
        body: {
          id,
          companyName: `Smoke Customer ${id.slice(-6)}`,
          contactName: 'Test',
          email: 'smoke@example.com',
          phone: '',
          mobile: '',
          address: '',
        },
      });
      const all = await req('/api/customers');
      assert(all.some((c) => c.id === id), 'created customer should be in list');
      await req(`/api/customers/${id}`, { method: 'PATCH', body: { contactName: 'Test Updated' } });
      const updated = await req(`/api/customers/${id}`, { method: 'PATCH', body: {} }).catch(() => null);
      void updated;
    });

    await step('CRUD: product', async () => {
      const id = `smoke-prod-${crypto.randomUUID()}`;
      created.productId = id;
      await req('/api/products', {
        method: 'POST',
        body: {
          id,
          name: `Smoke Product ${id.slice(-6)}`,
          productType: 'DörtKöşe',
          boxShape: 'Düz',
          dimensions: { width: 10, height: 10, depth: 10 },
          features: {},
          details: '',
          windowDetails: null,
          lidDetails: null,
          images: {},
          inks: {},
        },
      });
      const all = await req('/api/products');
      assert(all.some((p) => p.id === id), 'created product should be in list');
      await req(`/api/products/${id}`, { method: 'PATCH', body: { details: 'Updated' } });
    });

    await step('CRUD: stock item', async () => {
      const id = `smoke-stock-${crypto.randomUUID()}`;
      created.stockItemId = id;
      await req('/api/stock-items', {
        method: 'POST',
        body: {
          id,
          stockNumber: `SMK-${Date.now()}`,
          company: 'Smoke Co',
          product: 'Smoke Item',
          quantity: 5,
          unit: 'adet',
          category: 'raw',
          notes: 'smoke',
          productId: created.productId,
        },
      });
      const all = await req('/api/stock-items');
      assert(all.some((s) => s.id === id), 'created stock item should be in list');
      await req(`/api/stock-items/${id}`, { method: 'PATCH', body: { deduct: 1 } });
    });

    await step('CRUD: order', async () => {
      const id = `SMOKE-ORDER-${Date.now()}`;
      created.orderId = id;
      const customerId = created.customerId;
      const customerName = `Smoke Customer ${String(customerId).slice(-6)}`;
      const items = [
        {
          id: crypto.randomUUID(),
          productId: created.productId,
          productName: 'Smoke Product',
          quantity: 1,
          unitPrice: 10,
          vatRate: 20,
        },
      ];
      await req('/api/orders', {
        method: 'POST',
        body: {
          id,
          customerId,
          customerName,
          items,
          currency: 'TRY',
          status: 'new',
          subtotal: 10,
          vatTotal: 2,
          grandTotal: 12,
          paymentMethod: 'cash',
          maturityDays: 0,
          jobSize: '',
          boxSize: '',
          efficiency: '',
          prepaymentAmount: null,
          prepaymentRate: null,
          gofrePrice: null,
          gofreQuantity: null,
          gofreVatRate: null,
          shippingPrice: null,
          shippingVatRate: null,
          gofreUnitPrice: null,
        },
      });
      const list = await req('/api/orders');
      assert(list.some((o) => o.id === id), 'created order should be in list');
      await req(`/api/orders/${id}`, { method: 'PATCH', body: { status: 'production_planned' } });
    });

    await step('CRUD: weekly plan', async () => {
      const start = new Date();
      const end = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      const createdPlan = await req('/api/planning/weekly', {
        method: 'POST',
        body: {
          weekStartDate: start.toISOString().slice(0, 10),
          weekEndDate: end.toISOString().slice(0, 10),
          planData: { smoke: true, at: nowIso() },
        },
      });
      created.weeklyPlanId = createdPlan?.id || null;
      assert(!!created.weeklyPlanId, 'weekly plan id should exist');
      await req(`/api/planning/weekly/${created.weeklyPlanId}`, { method: 'PUT', body: { planData: { smoke: 'updated' } } });
      const plans = await req('/api/planning/weekly');
      assert(plans.some((p) => p.id === created.weeklyPlanId), 'weekly plan should be in list');
    });

    await step('Messages: send and mark read', async () => {
      const users = await req('/api/users');
      const roles = await req('/api/roles');
      const sender = users[0];
      const recipient = users[1] || users[0];

      const createdMsg = await req('/api/messages', {
        method: 'POST',
        body: {
          senderId: sender?.id,
          senderName: sender?.fullName || sender?.username || 'Sender',
          recipientId: recipient?.id,
          recipientName: recipient?.fullName || recipient?.username || 'Recipient',
          subject: 'Smoke',
          content: 'Smoke test message',
          relatedOrderId: created.orderId,
          threadId: null,
        },
      });

      created.messageId = createdMsg?.id || null;
      assert(!!created.messageId, 'message id should exist');

      await req(`/api/messages/${created.messageId}/read`, { method: 'PUT' });
      await req('/api/admin/messages');

      const roleId = roles?.[0]?.id;
      if (roleId) {
        const notifs = await req(`/api/notifications?roleId=${encodeURIComponent(roleId)}`);
        assert(Array.isArray(notifs), 'notifications should be array');
      }
    });
  } finally {
    await cleanup();
  }

  return smoke;
};

const main = async () => {
  const results = await run();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    process.exitCode = 1;
  }
  for (const r of results) {
    console.log(`${r.ok ? 'OK' : 'FAIL'} ${r.ms}ms - ${r.name}${r.error ? `: ${r.error}` : ''}`);
  }
};

await main();
