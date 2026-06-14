"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type AuthSuccess = {
  token: string;
  email: string;
};

type ApiError = {
  message?: string;
};

const defaultApiBaseUrl = "http://localhost:5000";

export default function SignupPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const json = (await response.json()) as AuthSuccess | ApiError;

      if (!response.ok) {
        const message = (json as ApiError).message ?? "Sign up failed.";
        setError(message);
        return;
      }

      const auth = json as AuthSuccess;
      localStorage.setItem("expenseKubex.token", auth.token);
      localStorage.setItem("expenseKubex.email", auth.email);
      setSuccess("Account created. Redirecting...");
      setTimeout(() => router.push("/"), 500);
    } catch {
      setError("Could not reach API. Make sure backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Signup form">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Set up your ExpenseKubex login.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />

          <label className="auth-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />

          {error ? <p className="auth-banner error">{error}</p> : null}
          {success ? <p className="auth-banner success">{success}</p> : null}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link className="auth-link" href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
