"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";

type Expense = {
  id: string;
  amount: number;
  category: string;
  note?: string | null;
  expenseDateUtc: string;
  createdAtUtc: string;
};

type ApiError = {
  message?: string;
};

type CreateExpensePayload = {
  amount: number;
  category: string;
  note: string;
  expenseDateUtc: string;
};

const defaultApiBaseUrl = "http://localhost:5000";

export default function Home() {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    []
  );

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  const [amount, setAmount] = useState("178.54");
  const [category, setCategory] = useState("Telecom");
  const [note, setNote] = useState("phone,internet");
  const [expenseDate, setExpenseDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("expenseKubex.token");
    const storedEmail = localStorage.getItem("expenseKubex.email") ?? "";
    setToken(storedToken);
    setEmail(storedEmail);
    setAuthReady(true);
  }, []);

  const loadExpenses = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingExpenses(true);
    setExpensesError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setExpensesError("Session expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        setExpensesError("Could not load expenses.");
        return;
      }

      const data = (await response.json()) as Expense[];
      setExpenses(data);
    } catch {
      setExpensesError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoadingExpenses(false);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadExpenses();
  }, [token, loadExpenses]);

  function signOut() {
    localStorage.removeItem("expenseKubex.token");
    localStorage.removeItem("expenseKubex.email");
    setToken(null);
    setEmail("");
    setExpenses([]);
    setMenuOpen(false);
    setSubmitSuccess(null);
    setSubmitError(null);
  }

  async function onCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!token) {
      setSubmitError("You need to sign in first.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Enter a valid amount greater than 0.");
      return;
    }

    if (!category.trim()) {
      setSubmitError("Category is required.");
      return;
    }

    if (!expenseDate) {
      setSubmitError("Date is required.");
      return;
    }

    const payload: CreateExpensePayload = {
      amount: parsedAmount,
      category: category.trim(),
      note: note.trim(),
      expenseDateUtc: `${expenseDate}T12:00:00Z`,
    };

    setSubmitLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as ApiError;
        setSubmitError(errorPayload.message ?? "Could not create expense.");
        return;
      }

      setSubmitSuccess("Expense saved.");
      setNote("");
      await loadExpenses();
    } catch {
      setSubmitError("Could not reach API. Make sure backend is running.");
    } finally {
      setSubmitLoading(false);
    }
  }

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (!authReady) {
    return <main className="page-shell"><div className="hero">Loading...</div></main>;
  }

  if (!token) {
    return (
      <main className="page-shell">
        <div className="hero">
          <h1 className="hero-title">Welcome to ExpenseKubex</h1>
          <p className="hero-subtitle">
            Sign in to manage expenses, or create an account to get started.
          </p>
          <div className="hero-actions">
            <Link className="hero-button primary" href="/login">
              Login
            </Link>
            <Link className="hero-button" href="/signup">
              Create Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">expenseKubex</div>
        <nav className="side-nav">
          <button className="side-link active" type="button">Home</button>
          <button className="side-link" type="button">Add Receipts</button>
          <button className="side-link" type="button">Wallet</button>
          <button className="side-link" type="button">New Expense Report</button>
          <button className="side-link" type="button">Drafts</button>
          <button className="side-link" type="button">Reporting</button>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">Expense Report</h1>
            <p className="topbar-subtitle">Track and submit your expenses</p>
          </div>

          <div className="profile-wrap">
            <button
              className="profile-button"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {email || "profile"}
            </button>
            {menuOpen ? (
              <div className="profile-menu">
                <Link href="/settings" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <button className="profile-menu-item" type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Expenses</h2>
            <p className="panel-subtitle">Total: {total.toFixed(2)} CAD</p>
          </div>

          {expensesError ? <p className="auth-banner error">{expensesError}</p> : null}
          {loadingExpenses ? <p className="panel-subtitle">Loading expenses...</p> : null}

          {!loadingExpenses && !expenses.length ? (
            <p className="panel-subtitle">No expenses yet. Add your first one below.</p>
          ) : null}

          {!!expenses.length ? (
            <div className="table-wrap">
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Details</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{new Date(expense.expenseDateUtc).toISOString().slice(0, 10)}</td>
                      <td>{expense.category}</td>
                      <td>{expense.note || "-"}</td>
                      <td>{expense.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="panel panel-form">
          <h2 className="panel-title">Add Expense</h2>
          <form className="expense-form" onSubmit={onCreateExpense}>
            <label>
              Date
              <input
                className="dashboard-input"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                required
              />
            </label>

            <label>
              Category
              <input
                className="dashboard-input"
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
                maxLength={100}
              />
            </label>

            <label>
              Amount
              <input
                className="dashboard-input"
                type="number"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>

            <label>
              Reason / Note
              <textarea
                className="dashboard-input dashboard-textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
              />
            </label>

            {submitError ? <p className="auth-banner error">{submitError}</p> : null}
            {submitSuccess ? <p className="auth-banner success">{submitSuccess}</p> : null}

            <button className="auth-button" type="submit" disabled={submitLoading}>
              {submitLoading ? "Saving..." : "Save"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
