"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";

type ApiResponse = {
  message?: string;
};

const defaultApiBaseUrl = "http://localhost:5000";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const hasEmail = email.trim().length > 0;
  const hasCode = code.trim().length > 0;

  useEffect(() => {
    const emailParam = searchParams.get("email");

    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!hasEmail) {
      setError("Missing email in reset link. Request a new reset email and open that link.");
      return;
    }

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
        <p className="auth-subtitle">
          {hasEmail
            ? `We sent a reset code to ${email}. Enter the code below to continue.`
            : "Open this page from your reset email link, then enter your reset code."}
        </p>

        <form className="auth-form" onSubmit={onSubmit}>
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

          {hasCode ? (
            <>
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
            </>
          ) : (
            <p className="auth-banner success">Enter the code first, then choose a new password.</p>
          )}

          {error ? <p className="auth-banner error">{error}</p> : null}
          {message ? <p className="auth-banner success">{message}</p> : null}

          <button className="auth-button" type="submit" disabled={loading || !hasCode || !hasEmail}>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell">
          <section className="auth-card" aria-label="Reset password form">
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">Loading reset form...</p>
          </section>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
