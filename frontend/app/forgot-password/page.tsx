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
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  async function requestResetCode() {
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

      const successMessage =
        json.message ?? "If that email exists, a reset code has been sent.";
      setMessage(successMessage);
      setEmailSent(true);
      setCodeVerified(false);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestResetCode();
  }

  async function onVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(json.message ?? "Could not verify code.");
        return;
      }

      setCodeVerified(true);
      setMessage(json.message ?? "Code verified.");
    } catch {
      setError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
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
      setTimeout(() => {
        window.location.href = "/login";
      }, 900);
    } catch {
      setError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Forgot password form">
        {emailSent ? (
          <>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              {codeVerified
                ? `Code confirmed for ${email}. Choose your new password.`
                : `We sent a reset code to ${email}. Please enter the code to continue.`}
            </p>

            {codeVerified ? (
              <form className="auth-form" onSubmit={onResetPassword}>
                {error ? <p className="auth-banner error">{error}</p> : null}
                {message ? <p className="auth-banner success">{message}</p> : null}

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

                <button className="auth-button" type="submit" disabled={loading}>
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={onVerifyCode}>
                {error ? <p className="auth-banner error">{error}</p> : null}
                {message ? <p className="auth-banner success">{message}</p> : null}

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

                <button className="auth-button" type="submit" disabled={loading}>
                  {loading ? "Checking code..." : "Verify code"}
                </button>
              </form>
            )}

            <p className="auth-footer">
              Didn&apos;t receive it?{" "}
              <button
                className="auth-link"
                type="button"
                onClick={() => void requestResetCode()}
                disabled={loading}
              >
                {loading ? "Sending again..." : "Send again"}
              </button>
            </p>
            <p className="auth-footer">
              Wrong email?{" "}
              <button
                className="auth-link"
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setCodeVerified(false);
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setMessage(null);
                  setError(null);
                }}
              >
                Try another email
              </button>
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </section>
    </main>
  );
}
