"use client";

import { useState, useEffect } from "react";
import {
  requestNotificationPermission,
  getPermissionStatus,
  sendTestNotification,
  registerServiceWorker,
} from "@/lib/notifications";
import type { Bill } from "@/lib/types";

interface NotificationPanelProps {
  bills: Bill[];
  onClose: () => void;
}

export default function NotificationPanel({
  bills,
  onClose,
}: NotificationPanelProps) {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [swReady, setSwReady] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermission(getPermissionStatus());
    registerServiceWorker().then((reg) => setSwReady(!!reg));
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const handleTest = () => {
    if (bills.length === 0) return;
    const bill = bills[0];
    sendTestNotification(bill.name, bill.amount);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const statusColor =
    permission === "granted"
      ? "var(--success)"
      : permission === "denied"
      ? "var(--danger)"
      : "var(--accent)";

  const statusLabel =
    permission === "granted"
      ? "Notifications Enabled ✓"
      : permission === "denied"
      ? "Notifications Blocked"
      : permission === "unsupported"
      ? "Not Supported"
      : "Notifications Off";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "24px 24px 0 0",
          padding: "28px 20px calc(28px + env(safe-area-inset-bottom, 0px))",
          width: "100%",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: "var(--muted)",
            borderRadius: 2,
            margin: "0 auto 20px",
            opacity: 0.4,
          }}
        />

        <div
          style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: 22,
            color: "var(--accent)",
            marginBottom: 6,
          }}
        >
          🔔 Notifications
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          Get reminders before your bills are due. Works on iOS via Safari
          &ldquo;Add to Home Screen&rdquo;.
        </p>

        {/* Status pill */}
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>
              {statusLabel}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {swReady ? "Service worker active" : "Service worker not registered"}
            </div>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }}
          />
        </div>

        {/* iOS instructions */}
        <div
          style={{
            background: "rgba(200,169,110,0.08)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            📱 iPhone Setup
          </div>
          <ol style={{ fontSize: 13, color: "var(--muted)", paddingLeft: 16, lineHeight: 1.8, margin: 0 }}>
            <li>Open this app in <strong style={{ color: "var(--text)" }}>Safari</strong></li>
            <li>Tap the <strong style={{ color: "var(--text)" }}>Share</strong> button (bottom bar)</li>
            <li>Select <strong style={{ color: "var(--text)" }}>&ldquo;Add to Home Screen&rdquo;</strong></li>
            <li>Open the app from your home screen</li>
            <li>Enable notifications below</li>
          </ol>
        </div>

        {permission !== "granted" && permission !== "denied" && (
          <button
            onClick={handleEnable}
            style={{
              width: "100%",
              background: "var(--accent)",
              color: "#0f1117",
              border: "none",
              borderRadius: 14,
              padding: 16,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            Enable Notifications
          </button>
        )}

        {permission === "denied" && (
          <div
            style={{
              background: "rgba(224,112,112,0.1)",
              border: "1px solid var(--danger)",
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
              color: "var(--danger)",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Notifications are blocked. Please enable them in your device Settings → Safari → Notifications.
          </div>
        )}

        {permission === "granted" && bills.length > 0 && (
          <button
            onClick={handleTest}
            style={{
              width: "100%",
              background: testSent ? "var(--success)" : "var(--surface2)",
              color: testSent ? "#0f1117" : "var(--text)",
              border: `1px solid ${testSent ? "var(--success)" : "var(--border)"}`,
              borderRadius: 14,
              padding: 14,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
              marginBottom: 12,
              transition: "all 0.2s",
            }}
          >
            {testSent ? "✓ Test sent!" : "Send Test Notification"}
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 14,
            fontSize: 15,
            fontFamily: "var(--font-dm-sans)",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}