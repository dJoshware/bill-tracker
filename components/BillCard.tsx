"use client";

import type { Bill } from "@/lib/types";
import {
    getCategoryInfo,
    formatCurrency,
    ordinal,
    isOverdue,
    isDueSoon,
    // MONTH_NAMES,
} from "@/lib/types";

interface BillCardProps {
    bill: Bill;
    monthKey: string;
    paid: boolean;
    onTogglePaid: (id: string) => void;
    onEdit: (bill: Bill) => void;
    onDelete: (id: string) => void;
}

export default function BillCard({
    bill,
    monthKey,
    paid,
    onTogglePaid,
    onEdit,
    onDelete,
}: BillCardProps) {
    const cat = getCategoryInfo(bill.category);
    const overdue = isOverdue(bill, monthKey, paid);
    const dueSoon = isDueSoon(bill, monthKey, paid);

    const accentColor = overdue
        ? "var(--danger)"
        : paid
          ? "var(--success)"
          : cat.color;

    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: paid ? 0.6 : 1,
                position: "relative",
                overflow: "hidden",
                transition: "opacity 0.2s",
            }}>
            {/* Left accent bar */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: accentColor,
                    borderRadius: "2px 0 0 2px",
                }}
            />

            {/* Check circle */}
            <button
                onClick={() => onTogglePaid(bill.id)}
                aria-label={paid ? "Mark unpaid" : "Mark paid"}
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `2px solid ${paid ? "var(--success)" : "var(--muted)"}`,
                    background: paid ? "var(--success)" : "transparent",
                    flexShrink: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    fontSize: 14,
                    color: "#0f1117",
                }}>
                {paid && "✓"}
            </button>

            {/* Bill info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "var(--text)",
                    }}>
                    {cat.icon} {bill.name}
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                    }}>
                    <span>{cat.label}</span>
                    <span
                        style={{
                            width: 3,
                            height: 3,
                            background: "var(--muted)",
                            borderRadius: "50%",
                            display: "inline-block",
                        }}
                    />
                    <span>Due {ordinal(bill.dueDay)}</span>
                    {bill.recurrence !== "monthly" && (
                        <>
                            <span
                                style={{
                                    width: 3,
                                    height: 3,
                                    background: "var(--muted)",
                                    borderRadius: "50%",
                                    display: "inline-block",
                                }}
                            />
                            <span
                                style={{
                                    color: "var(--accent)",
                                    fontSize: 10,
                                }}>
                                {bill.recurrence === "yearly"
                                    ? "YEARLY"
                                    : "ONE-TIME"}
                            </span>
                        </>
                    )}
                    {overdue && (
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "var(--danger)",
                                background: "rgba(224,112,112,0.12)",
                                borderRadius: 4,
                                padding: "1px 5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                            }}>
                            Overdue
                        </span>
                    )}
                    {dueSoon && !overdue && (
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#F0C97B",
                                background: "rgba(240,201,123,0.12)",
                                borderRadius: 4,
                                padding: "1px 5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                            }}>
                            Due Soon
                        </span>
                    )}
                </div>
                {bill.notes && (
                    <div
                        style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            marginTop: 2,
                            opacity: 0.7,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}>
                        {bill.notes}
                    </div>
                )}
            </div>

            {/* Right: amount + actions */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--accent)",
                    }}>
                    {formatCurrency(bill.amount)}
                </div>
                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                        justifyContent: "flex-end",
                    }}>
                    <button
                        onClick={() => onEdit(bill)}
                        style={iconBtnStyle}
                        aria-label='Edit'>
                        ✏️
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Delete "${bill.name}"?`))
                                onDelete(bill.id);
                        }}
                        style={{ ...iconBtnStyle, color: "var(--danger)" }}
                        aria-label='Delete'>
                        🗑
                    </button>
                </div>
            </div>
        </div>
    );
}

const iconBtnStyle: React.CSSProperties = {
    background: "var(--surface2)",
    border: "none",
    borderRadius: 8,
    width: 30,
    height: 30,
    cursor: "pointer",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};
