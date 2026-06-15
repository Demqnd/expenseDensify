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
  const [codeVerified, setCodeVerified] = useState(false);
  const hasEmail = email.trim().length > 0;

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const stageParam = searchParams.get("stage");

    if (emailParam) {
      setEmail(emailParam);
    } else {
      const rememberedEmail = localStorage.getItem("expenseKubex.resetEmail");
      if (rememberedEmail) {
        setEmail(rememberedEmail);
      }
    }

    if (stageParam === "password") {
      const verifiedEmail = sessionStorage.getItem("expenseKubex.resetVerifiedEmail");
      const verifiedCode = sessionStorage.getItem("expenseKubex.resetVerifiedCode");
      const effectiveEmail = (emailParam ?? localStorage.getItem("expenseKubex.resetEmail") ?? "").trim().toLowerCase();

      if (verifiedEmail && verifiedCode && verifiedEmail === effectiveEmail) {
        setCodeVerified(true);
        setCode(verifiedCode);
      }
    }
  }, [searchParams]);

  async function onVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!hasEmail) {
      setError("Missing email in reset link. Request a new reset email and open that link.");
      return;
    }

    if (!code.trim()) {
      setError("Reset code is required.");
      return;
    }

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

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCode = code.trim();
      sessionStorage.setItem("expenseKubex.resetVerifiedEmail", normalizedEmail);
      sessionStorage.setItem("expenseKubex.resetVerifiedCode", normalizedCode);
      setCodeVerified(true);
      setMessage(json.message ?? "Code verified. Set your new password.");
      router.replace(`/reset-password?email=${encodeURIComponent(normalizedEmail)}&stage=password`);
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

    if (!hasEmail) {
      setError("Missing email in reset link. Request a new reset email and open that link.");
      return;
    }

    if (!codeVerified) {
      setError("Please verify your reset code first.");
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
      localStorage.removeItem("expenseKubex.resetEmail");
      sessionStorage.removeItem("expenseKubex.resetVerifiedEmail");
      sessionStorage.removeItem("expenseKubex.resetVerifiedCode");
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
            ? codeVerified
              ? `Code confirmed for ${email}. Choose your new password.`
              : `We sent a reset code to ${email}. Enter the code and press Verify code.`
            : "Start from Forgot password so we can send your code and link this page to your email."}
        </p>

        {!hasEmail ? (
          <div className="auth-form">
            <p className="auth-banner error">Email context missing. Please request a reset code first.</p>
            <Link className="auth-button" href="/forgot-password">
              Go to Forgot password
            </Link>
          </div>
        ) : codeVerified ? (
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

            {error ? <p className="auth-banner error">{error}</p> : null}
            {message ? <p className="auth-banner success">{message}</p> : null}

            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Checking code..." : "Verify code"}
            </button>
          </form>
        )}

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
