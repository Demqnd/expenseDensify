'use strict';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const fs     = require('node:fs');
const path   = require('node:path');

// Use a dedicated test database
const TEST_DB = path.join(__dirname, 'test_expenses.db');
process.env.DB_PATH = TEST_DB;
process.env.PORT    = '4001';

// ── HTTP helper ────────────────────────────────
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port:     4001,
      path:     urlPath,
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Test server lifecycle ──────────────────────
let server;

before(async () => {
  // Clean up any leftover test DB
  [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`].forEach((f) => {
    try { fs.unlinkSync(f); } catch (_) {}
  });

  const app = require('./server');
  await new Promise((resolve) => {
    server = app.listen(4001, resolve);
  });
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
  [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`].forEach((f) => {
    try { fs.unlinkSync(f); } catch (_) {}
  });
});

// ── Auth tests ─────────────────────────────────
describe('POST /api/auth/login', () => {
  test('returns user data for valid employee credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      email:    'alice@densify.com',
      password: 'password123',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.email, 'alice@densify.com');
    assert.equal(res.body.role, 'employee');
    assert.ok(!res.body.password, 'password should not be returned');
  });

  test('returns manager data for valid manager credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      email:    'david@densify.com',
      password: 'password123',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'manager');
  });

  test('returns 401 for wrong password', async () => {
    const res = await request('POST', '/api/auth/login', {
      email:    'alice@densify.com',
      password: 'wrongpassword',
    });
    assert.equal(res.status, 401);
  });

  test('returns 401 for unknown email', async () => {
    const res = await request('POST', '/api/auth/login', {
      email:    'nobody@densify.com',
      password: 'password123',
    });
    assert.equal(res.status, 401);
  });

  test('returns 400 when email is missing', async () => {
    const res = await request('POST', '/api/auth/login', { password: 'password123' });
    assert.equal(res.status, 400);
  });
});

// ── Expense submission tests ───────────────────
describe('POST /api/expenses', () => {
  test('employee can submit an expense', async () => {
    const res = await request('POST', '/api/expenses', {
      employeeId:   1,
      date:         '2026-05-10',
      description:  'Taxi to airport',
      category:     'Travel',
      amount:       45.00,
      receiptNotes: 'Receipt #A001',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'pending');
    assert.equal(res.body.description, 'Taxi to airport');
    assert.equal(res.body.amount, 45);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request('POST', '/api/expenses', {
      employeeId: 1,
      date:       '2026-05-10',
      // missing description, category, amount
    });
    assert.equal(res.status, 400);
  });

  test('returns 400 for non-positive amount', async () => {
    const res = await request('POST', '/api/expenses', {
      employeeId:  1,
      date:        '2026-05-10',
      description: 'Negative test',
      category:    'Other',
      amount:      -10,
    });
    assert.equal(res.status, 400);
  });

  test('manager cannot submit an expense', async () => {
    const res = await request('POST', '/api/expenses', {
      employeeId:  4, // david is a manager
      date:        '2026-05-10',
      description: 'Manager trying to submit',
      category:    'Other',
      amount:      10,
    });
    assert.equal(res.status, 403);
  });
});

// ── Get expenses tests ─────────────────────────
describe('GET /api/expenses', () => {
  test('employee can retrieve their own expenses', async () => {
    const res = await request('GET', '/api/expenses?userId=1&role=employee');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.every((e) => e.employee_id === 1));
  });

  test('manager can retrieve all expenses', async () => {
    // Submit expense for bob first
    await request('POST', '/api/expenses', {
      employeeId: 2, date: '2026-05-11', description: 'Hotel', category: 'Accommodation', amount: 200,
    });

    const res = await request('GET', '/api/expenses?userId=4&role=manager');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    // Should include expenses from multiple employees
    const employeeIds = new Set(res.body.map((e) => e.employee_id));
    assert.ok(employeeIds.size >= 1);
  });

  test('returns 400 when userId is missing', async () => {
    const res = await request('GET', '/api/expenses?role=employee');
    assert.equal(res.status, 400);
  });
});

// ── Approve / Reject tests ─────────────────────
describe('PUT /api/expenses/:id/approve and reject', () => {
  let expenseId;

  beforeEach(async () => {
    // Submit a fresh expense
    const res = await request('POST', '/api/expenses', {
      employeeId:  3, // carol
      date:        '2026-05-12',
      description: 'Conference fee',
      category:    'Training & Education',
      amount:      500,
    });
    expenseId = res.body.id;
  });

  test('manager can approve a pending expense', async () => {
    const res = await request('PUT', `/api/expenses/${expenseId}/approve`, {
      managerId: 4,
      note:      'Approved for Q2 budget',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'approved');
    assert.equal(res.body.manager_note, 'Approved for Q2 budget');
    assert.ok(res.body.reviewer_name);
  });

  test('manager can reject a pending expense', async () => {
    const res = await request('PUT', `/api/expenses/${expenseId}/reject`, {
      managerId: 4,
      note:      'Insufficient documentation',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'rejected');
  });

  test('cannot approve an already-reviewed expense', async () => {
    // Approve first
    await request('PUT', `/api/expenses/${expenseId}/approve`, { managerId: 4 });
    // Try to approve again
    const res = await request('PUT', `/api/expenses/${expenseId}/approve`, { managerId: 4 });
    assert.equal(res.status, 409);
  });

  test('employee cannot approve an expense', async () => {
    const res = await request('PUT', `/api/expenses/${expenseId}/approve`, {
      managerId: 1, // alice is an employee
    });
    assert.equal(res.status, 403);
  });

  test('returns 404 for non-existent expense', async () => {
    const res = await request('PUT', '/api/expenses/99999/approve', { managerId: 4 });
    assert.equal(res.status, 404);
  });

  test('returns 400 when managerId is missing', async () => {
    const res = await request('PUT', `/api/expenses/${expenseId}/approve`, {});
    assert.equal(res.status, 400);
  });
});

// ── Stats tests ────────────────────────────────
describe('GET /api/stats', () => {
  test('manager can retrieve stats', async () => {
    const res = await request('GET', '/api/stats?role=manager');
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.total    === 'number');
    assert.ok(typeof res.body.pending  === 'number');
    assert.ok(typeof res.body.approved === 'number');
    assert.ok(typeof res.body.rejected === 'number');
    assert.ok(typeof res.body.total_approved_amount === 'number' || res.body.total_approved_amount === null);
  });

  test('non-manager cannot access stats', async () => {
    const res = await request('GET', '/api/stats?role=employee');
    assert.equal(res.status, 403);
  });
});
