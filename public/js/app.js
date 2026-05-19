'use strict';

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────
let currentUser  = null;
let allExpenses  = [];
let pendingAction = null; // { expenseId, action }

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status) {
  return `<span class="status-badge status-${status}">${status}</span>`;
}

function emptyState(msg) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
    <p>${msg}</p>
  </div>`;
}

// ──────────────────────────────────────────────
// API wrappers
// ──────────────────────────────────────────────
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = document.getElementById('login-btn');
  const alert = document.getElementById('login-alert');
  alert.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const user = await api('POST', '/api/auth/login', {
      email:    document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
    });
    currentUser = user;
    showApp();
  } catch (err) {
    alert.textContent = err.message;
    alert.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  currentUser = null;
  allExpenses = [];
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
  document.getElementById('view-app').classList.add('hidden');
  document.getElementById('view-login').classList.remove('hidden');
});

// ──────────────────────────────────────────────
// Show app after login
// ──────────────────────────────────────────────
function showApp() {
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-app').classList.remove('hidden');

  document.getElementById('nav-user-name').textContent = currentUser.name;
  document.getElementById('nav-user-role').textContent = currentUser.role;

  if (currentUser.role === 'manager') {
    document.getElementById('manager-dashboard').classList.remove('hidden');
    document.getElementById('employee-dashboard').classList.add('hidden');
    loadManagerDashboard();
  } else {
    document.getElementById('employee-dashboard').classList.remove('hidden');
    document.getElementById('manager-dashboard').classList.add('hidden');
    // Default today's date
    document.getElementById('exp-date').valueAsDate = new Date();
    loadMyExpenses();
  }
}

// ──────────────────────────────────────────────
// Employee: tab switching
// ──────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-submit').classList.toggle('hidden',      tab !== 'submit');
    document.getElementById('tab-my-expenses').classList.toggle('hidden', tab !== 'my-expenses');
    if (tab === 'my-expenses') loadMyExpenses();
  });
});

// ──────────────────────────────────────────────
// Employee: submit expense
// ──────────────────────────────────────────────
document.getElementById('expense-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('expense-form-alert');
  alertEl.className = 'hidden';
  const btn = document.getElementById('submit-expense-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    await api('POST', '/api/expenses', {
      employeeId:   currentUser.id,
      date:         document.getElementById('exp-date').value,
      description:  document.getElementById('exp-description').value,
      category:     document.getElementById('exp-category').value,
      amount:       parseFloat(document.getElementById('exp-amount').value),
      receiptNotes: document.getElementById('exp-receipt').value,
    });

    alertEl.className = 'alert alert-success';
    alertEl.textContent = '✓ Expense submitted successfully! It is now pending manager approval.';
    document.getElementById('expense-form').reset();
    document.getElementById('exp-date').valueAsDate = new Date();
  } catch (err) {
    alertEl.className = 'alert alert-error';
    alertEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit for Approval';
  }
});

// ──────────────────────────────────────────────
// Employee: load my expenses
// ──────────────────────────────────────────────
async function loadMyExpenses() {
  const container = document.getElementById('my-expenses-body');
  container.innerHTML = '<p style="color:var(--gray-500);padding:1rem 0">Loading…</p>';
  try {
    const expenses = await api('GET', `/api/expenses?userId=${currentUser.id}&role=employee`);
    renderMyExpenses(expenses);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

document.getElementById('refresh-my-expenses').addEventListener('click', loadMyExpenses);

function renderMyExpenses(expenses) {
  const container = document.getElementById('my-expenses-body');
  if (!expenses.length) {
    container.innerHTML = emptyState("You haven't submitted any expenses yet.");
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Submitted</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="my-expenses-rows"></tbody>
      </table>
    </div>`;

  const tbody = document.getElementById('my-expenses-rows');
  expenses.forEach((exp) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(exp.date)}</td>
      <td>${escHtml(exp.category)}</td>
      <td>${escHtml(exp.description)}</td>
      <td class="amount-cell">${fmt(exp.amount)}</td>
      <td>${statusBadge(exp.status)}</td>
      <td class="text-xs" style="color:var(--gray-500)">${fmtDate(exp.created_at)}</td>
      <td><button class="btn btn-ghost btn-sm" data-id="${exp.id}">Details</button></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const exp = expenses.find((e) => e.id === Number(btn.dataset.id));
      if (exp) showDetailModal(exp);
    });
  });
}

// ──────────────────────────────────────────────
// Manager: load dashboard
// ──────────────────────────────────────────────
async function loadManagerDashboard() {
  await Promise.all([loadStats(), loadAllExpenses()]);
}

async function loadStats() {
  try {
    const s = await api('GET', '/api/stats?role=manager');
    document.getElementById('stats-row').innerHTML = `
      <div class="stat-card total">
        <span class="stat-label">Total Requests</span>
        <span class="stat-value">${s.total}</span>
      </div>
      <div class="stat-card pending">
        <span class="stat-label">Pending</span>
        <span class="stat-value">${s.pending}</span>
      </div>
      <div class="stat-card approved">
        <span class="stat-label">Approved</span>
        <span class="stat-value">${s.approved}</span>
      </div>
      <div class="stat-card rejected">
        <span class="stat-label">Rejected</span>
        <span class="stat-value">${s.rejected}</span>
      </div>
      <div class="stat-card amount">
        <span class="stat-label">Total Approved</span>
        <span class="stat-value">${fmt(s.total_approved_amount || 0)}</span>
      </div>`;
  } catch (_) { /* non-fatal */ }
}

async function loadAllExpenses() {
  const container = document.getElementById('all-expenses-body');
  container.innerHTML = '<p style="color:var(--gray-500);padding:1rem 0">Loading…</p>';
  try {
    allExpenses = await api('GET', `/api/expenses?userId=${currentUser.id}&role=manager`);
    renderAllExpenses();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

document.getElementById('refresh-all-expenses').addEventListener('click', loadManagerDashboard);

// Filters
['filter-status', 'filter-category', 'filter-search'].forEach((id) => {
  document.getElementById(id).addEventListener('input', renderAllExpenses);
});

function renderAllExpenses() {
  const status   = document.getElementById('filter-status').value;
  const category = document.getElementById('filter-category').value;
  const search   = document.getElementById('filter-search').value.toLowerCase();

  const filtered = allExpenses.filter((e) => {
    if (status   && e.status   !== status)   return false;
    if (category && e.category !== category) return false;
    if (search   && !( 
      e.employee_name.toLowerCase().includes(search) ||
      e.description.toLowerCase().includes(search)
    )) return false;
    return true;
  });

  const container = document.getElementById('all-expenses-body');

  if (!filtered.length) {
    container.innerHTML = emptyState('No expenses match the current filters.');
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="all-expenses-rows"></tbody>
      </table>
    </div>`;

  const tbody = document.getElementById('all-expenses-rows');
  filtered.forEach((exp) => {
    const tr = document.createElement('tr');
    const isPending = exp.status === 'pending';
    tr.innerHTML = `
      <td>
        <div>${escHtml(exp.employee_name)}</div>
        <div class="text-xs" style="color:var(--gray-500)">${escHtml(exp.department || '')}</div>
      </td>
      <td>${fmtDate(exp.date)}</td>
      <td>${escHtml(exp.category)}</td>
      <td>${escHtml(exp.description)}</td>
      <td class="amount-cell">${fmt(exp.amount)}</td>
      <td>${statusBadge(exp.status)}</td>
      <td class="text-xs" style="color:var(--gray-500)">${fmtDate(exp.created_at)}</td>
      <td>
        ${isPending
          ? `<button class="btn btn-success btn-sm review-btn" data-id="${exp.id}" data-action="approve">Approve</button>
             <button class="btn btn-danger btn-sm review-btn" data-id="${exp.id}" data-action="reject" style="margin-left:.4rem">Reject</button>`
          : `<button class="btn btn-ghost btn-sm view-btn" data-id="${exp.id}">Details</button>`}
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.review-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const exp = allExpenses.find((e) => e.id === Number(btn.dataset.id));
      if (exp) openReviewModal(exp, btn.dataset.action);
    });
  });

  tbody.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const exp = allExpenses.find((e) => e.id === Number(btn.dataset.id));
      if (exp) showDetailModal(exp);
    });
  });
}

// ──────────────────────────────────────────────
// Review modal
// ──────────────────────────────────────────────
function openReviewModal(exp, action) {
  pendingAction = { expenseId: exp.id, action };
  document.getElementById('review-modal-title').textContent =
    action === 'approve' ? '✅ Approve Expense' : '❌ Reject Expense';
  document.getElementById('review-expense-details').innerHTML = `
    <strong>Employee:</strong> ${escHtml(exp.employee_name)} (${escHtml(exp.department || '')})<br>
    <strong>Date:</strong> ${fmtDate(exp.date)}<br>
    <strong>Category:</strong> ${escHtml(exp.category)}<br>
    <strong>Description:</strong> ${escHtml(exp.description)}<br>
    <strong>Amount:</strong> ${fmt(exp.amount)}<br>
    ${exp.receipt_notes ? `<strong>Receipt notes:</strong> ${escHtml(exp.receipt_notes)}<br>` : ''}
  `;
  document.getElementById('review-note').value = '';
  document.getElementById('review-modal').classList.remove('hidden');
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('review-modal').classList.add('hidden');
  pendingAction = null;
});

document.getElementById('modal-approve').addEventListener('click', () => submitReview('approve'));
document.getElementById('modal-reject').addEventListener('click', ()  => submitReview('reject'));

async function submitReview(action) {
  if (!pendingAction) return;
  const { expenseId } = pendingAction;
  const note  = document.getElementById('review-note').value.trim();
  const appBtn = document.getElementById('modal-approve');
  const rejBtn = document.getElementById('modal-reject');
  appBtn.disabled = rejBtn.disabled = true;

  try {
    await api('PUT', `/api/expenses/${expenseId}/${action}`, {
      managerId: currentUser.id,
      note,
    });
    document.getElementById('review-modal').classList.add('hidden');
    pendingAction = null;
    await loadManagerDashboard();
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    appBtn.disabled = rejBtn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// Detail modal (read-only)
// ──────────────────────────────────────────────
function showDetailModal(exp) {
  const isManager = currentUser.role === 'manager';
  document.getElementById('detail-expense-content').innerHTML = `
    ${isManager ? `<strong>Employee:</strong> ${escHtml(exp.employee_name)} (${escHtml(exp.department || '')})<br>` : ''}
    <strong>Date:</strong> ${fmtDate(exp.date)}<br>
    <strong>Category:</strong> ${escHtml(exp.category)}<br>
    <strong>Description:</strong> ${escHtml(exp.description)}<br>
    <strong>Amount:</strong> ${fmt(exp.amount)}<br>
    ${exp.receipt_notes ? `<strong>Receipt notes:</strong> ${escHtml(exp.receipt_notes)}<br>` : ''}
    <strong>Status:</strong> ${statusBadge(exp.status)}<br>
    <strong>Submitted:</strong> ${fmtDate(exp.created_at)}<br>
    ${exp.reviewed_at ? `<strong>Reviewed:</strong> ${fmtDate(exp.reviewed_at)} by ${escHtml(exp.reviewer_name || '—')}<br>` : ''}
    ${exp.manager_note ? `<strong>Manager note:</strong> ${escHtml(exp.manager_note)}<br>` : ''}
  `;
  document.getElementById('detail-modal').classList.remove('hidden');
}

document.getElementById('detail-close').addEventListener('click', () => {
  document.getElementById('detail-modal').classList.add('hidden');
});

// Close modals on backdrop click
document.getElementById('review-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('review-modal').classList.add('hidden');
    pendingAction = null;
  }
});
document.getElementById('detail-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('detail-modal').classList.add('hidden');
  }
});

// ──────────────────────────────────────────────
// Security helper – escape HTML to prevent XSS
// ──────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
