"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";

const defaultApiBaseUrl = "http://localhost:5000";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Employee");
  const [token, setToken] = useState("");

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookUpdatedAt, setWebhookUpdatedAt] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState("");
  const [webhookSuccess, setWebhookSuccess] = useState("");

  const [message, setMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;
  const isAdmin = role === "Admin";

  useEffect(() => {
    setEmail(localStorage.getItem("expenseKubex.email") ?? "");
    setRole(localStorage.getItem("expenseKubex.role") ?? "Employee");
    setToken(localStorage.getItem("expenseKubex.token") ?? "");
  }, []);

  useEffect(() => {
    if (!isAdmin || !token) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/webhook`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setWebhookUrl(data.url ?? "");
          setWebhookUpdatedAt(data.updatedAtUtc ?? null);
        }
      } catch {
        // Ignore load failures; the form still lets the admin set a URL.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token, apiBaseUrl]);

  const onSaveWebhookUrl = async (event: React.FormEvent) => {
    event.preventDefault();
    setWebhookError("");
    setWebhookSuccess("");
    setWebhookLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/webhook`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setWebhookError(data?.message ?? "Failed to save the webhook URL.");
        return;
      }

      setWebhookUrl(data.url ?? "");
      setWebhookUpdatedAt(data.updatedAtUtc ?? null);
      setWebhookSuccess("Webhook URL saved.");
    } catch {
      setWebhookError("Failed to reach the server.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const onSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendError("");
    setSendSuccess("");
    setSendLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/webhook/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSendError(data?.message ?? "Failed to send the message.");
        return;
      }

      setSendSuccess("Message sent to the webhook.");
      setMessage("");
    } catch {
      setSendError("Failed to reach the server.");
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="auth-card" aria-label="Settings page">
        <h1 className="auth-title">Profile & Settings</h1>
        <p className="auth-subtitle">More account settings can be added here next.</p>

        <p className="auth-banner success">Signed in as {email || "unknown user"}</p>

        {isAdmin ? (
          <>
            <h2 className="auth-title" style={{ fontSize: "1.1rem", marginTop: 24 }}>
              Webhook Routine
            </h2>
            <p className="auth-subtitle">
              Configure a webhook URL and send it a message on demand.
            </p>

            <form onSubmit={onSaveWebhookUrl}>
              <label>
                Webhook URL
                <input
                  className="dashboard-input"
                  type="url"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://example.com/webhook"
                  required
                />
              </label>

              <button className="auth-button" type="submit" disabled={webhookLoading}>
                {webhookLoading ? "Saving..." : "Save URL"}
              </button>
            </form>

            {webhookUpdatedAt ? (
              <p className="panel-subtitle">
                Last updated {new Date(webhookUpdatedAt).toLocaleString()}
              </p>
            ) : null}
            {webhookError ? <p className="auth-banner error">{webhookError}</p> : null}
            {webhookSuccess ? <p className="auth-banner success">{webhookSuccess}</p> : null}

            <form onSubmit={onSendMessage} style={{ marginTop: 16 }}>
              <label>
                Message
                <textarea
                  className="dashboard-input dashboard-textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Message to send to the webhook"
                  required
                />
              </label>

              <button className="auth-button" type="submit" disabled={sendLoading}>
                {sendLoading ? "Sending..." : "Send Message"}
              </button>
            </form>

            {sendError ? <p className="auth-banner error">{sendError}</p> : null}
            {sendSuccess ? <p className="auth-banner success">{sendSuccess}</p> : null}
          </>
        ) : null}

        <p className="auth-footer">
          <Link className="auth-link" href="/">
            Back to Dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
