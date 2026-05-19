'use strict';

const express = require('express');
const path    = require('path');
const { getDb, hashPassword } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.json({
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    department: user.department,
  });
});

// ──────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────

/**
 * GET /api/expenses
 * - manager: all expenses
 * - employee: only their own
 * Query params: userId, role
 */
app.get('/api/expenses', (req, res) => {
  const { userId, role } = req.query;
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required.' });
  }

  const db = getDb();
  let rows;

  if (role === 'manager') {
    rows = db.prepare(`
      SELECT e.*,
             u.name  AS employee_name,
             u.email AS employee_email,
             u.department,
             m.name  AS reviewer_name
        FROM expenses e
        JOIN users u ON u.id = e.employee_id
        LEFT JOIN users m ON m.id = e.reviewed_by
       ORDER BY e.created_at DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT e.*,
             u.name  AS employee_name,
             u.email AS employee_email,
             u.department,
             m.name  AS reviewer_name
        FROM expenses e
        JOIN users u ON u.id = e.employee_id
        LEFT JOIN users m ON m.id = e.reviewed_by
       WHERE e.employee_id = ?
       ORDER BY e.created_at DESC
    `).all(Number(userId));
  }

  res.json(rows);
});

/**
 * POST /api/expenses
 * Body: { employeeId, date, description, category, amount, receiptNotes }
 */
app.post('/api/expenses', (req, res) => {
  const { employeeId, date, description, category, amount, receiptNotes } = req.body || {};

  if (!employeeId || !date || !description || !category || amount == null) {
    return res.status(400).json({ error: 'employeeId, date, description, category and amount are required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(Number(employeeId), 'employee');
  if (!user) {
    return res.status(403).json({ error: 'Only employees can submit expenses.' });
  }

  const result = db.prepare(`
    INSERT INTO expenses (employee_id, date, description, category, amount, receipt_notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(Number(employeeId), date, description.trim(), category.trim(), parsedAmount, (receiptNotes || '').trim() || null);

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(expense);
});

/**
 * PUT /api/expenses/:id/approve
 * Body: { managerId, note }
 */
app.put('/api/expenses/:id/approve', (req, res) => {
  updateExpenseStatus(req, res, 'approved');
});

/**
 * PUT /api/expenses/:id/reject
 * Body: { managerId, note }
 */
app.put('/api/expenses/:id/reject', (req, res) => {
  updateExpenseStatus(req, res, 'rejected');
});

function updateExpenseStatus(req, res, newStatus) {
  const expenseId  = Number(req.params.id);
  const { managerId, note } = req.body || {};

  if (!managerId) {
    return res.status(400).json({ error: 'managerId is required.' });
  }

  const db = getDb();
  const manager = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(Number(managerId), 'manager');
  if (!manager) {
    return res.status(403).json({ error: 'Only managers can review expenses.' });
  }

  const expense = db.prepare('SELECT id, status FROM expenses WHERE id = ?').get(expenseId);
  if (!expense) {
    return res.status(404).json({ error: 'Expense not found.' });
  }
  if (expense.status !== 'pending') {
    return res.status(409).json({ error: `Expense has already been ${expense.status}.` });
  }

  db.prepare(`
    UPDATE expenses
       SET status      = ?,
           manager_note = ?,
           reviewed_by  = ?,
           reviewed_at  = datetime('now')
     WHERE id = ?
  `).run(newStatus, (note || '').trim() || null, Number(managerId), expenseId);

  const updated = db.prepare(`
    SELECT e.*,
           u.name  AS employee_name,
           u.email AS employee_email,
           u.department,
           m.name  AS reviewer_name
      FROM expenses e
      JOIN users u ON u.id = e.employee_id
      LEFT JOIN users m ON m.id = e.reviewed_by
     WHERE e.id = ?
  `).get(expenseId);

  res.json(updated);
}

// ──────────────────────────────────────────────
// Stats (manager dashboard summary)
// ──────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const { role } = req.query;
  if (role !== 'manager') {
    return res.status(403).json({ error: 'Only managers can view stats.' });
  }

  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*)                              AS total,
      SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected,
      ROUND(SUM(CASE WHEN status='approved' THEN amount ELSE 0 END), 2) AS total_approved_amount
    FROM expenses
  `).get();

  res.json(stats);
});

// ──────────────────────────────────────────────
// Serve SPA entry points
// ──────────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only start listening when invoked directly (not when require()'d in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ExpenseDensify running at http://localhost:${PORT}`);
    getDb(); // ensure DB is ready
  });
}

module.exports = app;
