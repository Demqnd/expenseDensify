"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEmail(localStorage.getItem("expenseKubex.email") ?? "");
  }, []);

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Settings page">
        <h1 className="auth-title">Profile & Settings</h1>
        <p className="auth-subtitle">More account settings can be added here next.</p>

        <p className="auth-banner success">Signed in as {email || "unknown user"}</p>

        <p className="auth-footer">
          <Link className="auth-link" href="/">
            Back to Dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
