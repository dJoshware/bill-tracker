"use client";

import { useState, useEffect } from "react";
import type { Bill, Category } from "@/lib/types";
import { CATEGORIES, NOTIFY_OPTIONS } from "@/lib/types";

interface BillFormProps {
  initial?: Bill | null;
  onSave: (bill: Bill) => void;
  onClose: () => void;
  currentMonthKey: string;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function BillForm({
  initial,
  onSave,
  onClose,
  currentMonthKey,
}: BillFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [dueDay, setDueDay] = useState(initial ? String(initial.dueDay) : "");
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "other"
  );
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(
    initial?.notifyDaysBefore ?? 3
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) e.amount = "Enter a valid amount";
    const day = parseInt(dueDay);
    if (isNaN(day) || day < 1 || day > 31) e.dueDay = "Enter a day 1–31";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    const bill: Bill = {
      id: initial?.id ?? generateId(),
      name: name.trim(),
      amount: parseFloat(amount),
      dueDay: parseInt(dueDay),
      category,
      recurring,
      notifyDaysBefore,
      notes: notes.trim() || undefined,
      monthKey: recurring ? undefined : currentMonthKey,
    };
    onSave(bill);
    onClose();
  };

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
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
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
            marginBottom: 20,
          }}
        >
          {initial ? "Edit Bill" : "Add a Bill"}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Bill Name</label>
          <input
            style={{ ...inputStyle, borderColor: errors.name ? "var(--danger)" : undefined }}
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
            placeholder="Netflix, Electric, Rent…"
            autoFocus
          />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        {/* Amount + Due Day */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Amount ($)</label>
            <input
              style={{ ...inputStyle, borderColor: errors.amount ? "var(--danger)" : undefined }}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: "" })); }}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.amount && <div style={errorStyle}>{errors.amount}</div>}
          </div>
          <div>
            <label style={labelStyle}>Due Day</label>
            <input
              style={{ ...inputStyle, borderColor: errors.dueDay ? "var(--danger)" : undefined }}
              value={dueDay}
              onChange={(e) => { setDueDay(e.target.value); setErrors((p) => ({ ...p, dueDay: "" })); }}
              type="number"
              inputMode="numeric"
              placeholder="1–31"
              min="1"
              max="31"
            />
            {errors.dueDay && <div style={errorStyle}>{errors.dueDay}</div>}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Category</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  background: category === cat.id
                    ? `rgba(${hexToRgb(cat.color)},0.18)`
                    : "var(--surface2)",
                  border: `1px solid ${category === cat.id ? cat.color : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "8px 4px",
                  color: category === cat.id ? cat.color : "var(--muted)",
                  fontSize: 12,
                  fontFamily: "var(--font-dm-sans)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span>{cat.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notify */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Remind Me</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
            {NOTIFY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setNotifyDaysBefore(opt.value)}
                style={{
                  background: notifyDaysBefore === opt.value ? "rgba(200,169,110,0.15)" : "var(--surface2)",
                  border: `1px solid ${notifyDaysBefore === opt.value ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "10px 8px",
                  color: notifyDaysBefore === opt.value ? "var(--accent)" : "var(--muted)",
                  fontSize: 13,
                  fontFamily: "var(--font-dm-sans)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring toggle */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--text)" }}>🔄 Recurring monthly</span>
            <label style={{ position: "relative", width: 44, height: 26, display: "block" }}>
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: recurring ? "var(--success)" : "var(--surface)",
                  border: `1px solid ${recurring ? "var(--success)" : "var(--border)"}`,
                  borderRadius: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    background: recurring ? "#0f1117" : "var(--muted)",
                    borderRadius: "50%",
                    top: 2,
                    left: recurring ? 20 : 2,
                    transition: "all 0.2s",
                  }}
                />
              </span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea
            style={{
              ...inputStyle,
              height: 72,
              resize: "none",
              lineHeight: 1.5,
            }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Account #, website, etc."
          />
        </div>

        <button
          onClick={handleSubmit}
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
          }}
        >
          {initial ? "Save Changes" : "Add Bill"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--muted)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "13px 14px",
  color: "var(--text)",
  fontFamily: "var(--font-dm-sans)",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--danger)",
  marginTop: 4,
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}