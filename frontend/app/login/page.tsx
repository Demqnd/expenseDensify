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

export default function LoginPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
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
        const message = (json as ApiError).message ?? "Login failed.";
        setError(message);
        return;
      }

      const auth = json as AuthSuccess;
      localStorage.setItem("expenseDensify.token", auth.token);
      localStorage.setItem("expenseDensify.email", auth.email);
      setSuccess("Login successful. Redirecting...");
      setTimeout(() => router.push("/"), 500);
    } catch {
      setError("Could not reach API. Make sure backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Login form">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Welcome back. Enter your account details.</p>

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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <p className="auth-inline-link-wrap">
            <Link className="auth-link" href="/forgot-password">
              Forgot your password?
            </Link>
          </p>

          {error ? <p className="auth-banner error">{error}</p> : null}
          {success ? <p className="auth-banner success">{success}</p> : null}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          New here? <Link className="auth-link" href="/signup">Create an account</Link>
        </p>

        <p className="auth-footer">
          Have a reset code? <Link className="auth-link" href="/reset-password">Reset password</Link>
        </p>
      </section>
    </main>
  );
}
