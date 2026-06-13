"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ApiResponse = {
  message?: string;
};

const defaultApiBaseUrl = "http://localhost:5000";

export default function ResetPasswordPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    []
  );

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
          newPassword,
        }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(json.message ?? "Could not reset password.");
        return;
      }

      setMessage(json.message ?? "Password reset successful.");
      setTimeout(() => router.push("/login"), 900);
    } catch {
      setError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Reset password form">
        <h1 className="auth-title">Reset password</h1>
        <p className="auth-subtitle">Enter your email, code, and new password.</p>

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

          <label className="auth-label" htmlFor="code">
            Reset code
          </label>
          <input
            id="code"
            className="auth-input"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />

          <label className="auth-label" htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
          />

          <label className="auth-label" htmlFor="confirmPassword">
            Confirm new password
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
          {message ? <p className="auth-banner success">{message}</p> : null}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="auth-footer">
          <Link className="auth-link" href="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
