"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type ApiResponse = {
  message?: string;
};

const defaultApiBaseUrl = "http://localhost:5000";

export default function ForgotPasswordPage() {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    []
  );

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(json.message ?? "Could not request reset code.");
        return;
      }

      setMessage(json.message ?? "If that email exists, a reset code has been sent.");
    } catch {
      setError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Forgot password form">
        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-subtitle">Enter your email and we will send a reset code.</p>

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

          {error ? <p className="auth-banner error">{error}</p> : null}
          {message ? <p className="auth-banner success">{message}</p> : null}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset code"}
          </button>
        </form>

        <p className="auth-footer">
          Remembered your password? <Link className="auth-link" href="/login">Back to login</Link>
        </p>
        <p className="auth-footer">
          Got a code already? <Link className="auth-link" href="/reset-password">Reset password</Link>
        </p>
      </section>
    </main>
  );
}
