'use client';

import * as React from 'react';
import type { Bill, PaidRecord } from '@/lib/types';
import { STORAGE_BILLS, STORAGE_PAID_PREFIX, getMonthKey } from '@/lib/types';
import { runMigrations } from '@/lib/migrate';

export function useBills() {
    const [bills, setBills] = React.useState<Bill[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        try {
            runMigrations();
            const raw = localStorage.getItem(STORAGE_BILLS);
            if (raw) setBills(JSON.parse(raw));
        } catch {}
        setLoaded(true);
    }, []);

    const saveBills = React.useCallback((next: Bill[]) => {
        setBills(next);
        try {
            localStorage.setItem(STORAGE_BILLS, JSON.stringify(next));
        } catch {}
    }, []);

    const addBill = React.useCallback(
        (bill: Bill) => saveBills([...bills, bill]),
        [bills, saveBills],
    );

    const updateBill = React.useCallback(
        (id: string, updates: Partial<Bill>) =>
            saveBills(bills.map(b => (b.id === id ? { ...b, ...updates } : b))),
        [bills, saveBills],
    );

    const deleteBill = React.useCallback(
        (id: string) => saveBills(bills.filter(b => b.id !== id)),
        [bills, saveBills],
    );

    return { bills, loaded, addBill, updateBill, deleteBill };
}

export function usePaid(monthKey: string) {
    const [paid, setPaid] = React.useState<PaidRecord>({});

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_PAID_PREFIX + monthKey);
            if (raw) setPaid(JSON.parse(raw));
            else setPaid({});
        } catch {
            setPaid({});
        }
    }, [monthKey]);

    const togglePaid = React.useCallback(
        (id: string) => {
            const next = { ...paid };
            if (next[id]) delete next[id];
            else next[id] = true;
            setPaid(next);
            try {
                localStorage.setItem(
                    STORAGE_PAID_PREFIX + monthKey,
                    JSON.stringify(next),
                );
            } catch {}
        },
        [paid, monthKey],
    );

    return { paid, togglePaid };
}

export function getCurrentMonthKey() {
    const d = new Date();
    return getMonthKey(d.getFullYear(), d.getMonth());
}
