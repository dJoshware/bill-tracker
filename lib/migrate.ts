/**
 * localStorage migration utility.
 *
 * Every time the Bill schema changes, add a new entry to MIGRATIONS.
 * Each migration reads from its "from" key, upgrades the data shape,
 * writes to the "to" key, then removes the old key so it only runs once.
 *
 * Migrations run in order on every app startup — they're cheap no-ops
 * if the source key doesn't exist.
 */

import type { Bill, Recurrence } from './types';
import { STORAGE_BILLS } from './types';

// ─── Legacy shapes ────────────────────────────────────────────────────────────

/** v1 / v2 bill shape — used `recurring: boolean` instead of `recurrence` */
interface BillV2 {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    recurring: boolean; // old field
    monthKey?: string;
    notes?: string;
    notifyDaysBefore: number;
    color?: string;
}

// ─── Migration helpers ────────────────────────────────────────────────────────

function upgradeV2ToV3(old: BillV2): Bill {
    let recurrence: Recurrence = 'monthly';
    if (!old.recurring) recurrence = 'once';
    // recurring bills had no monthKey; one-time bills had one
    return {
        id: old.id,
        name: old.name,
        amount: old.amount,
        dueDay: old.dueDay,
        category: old.category as Bill['category'],
        recurrence,
        monthKey: old.monthKey,
        notes: old.notes,
        notifyDaysBefore: old.notifyDaysBefore ?? 3,
        color: old.color,
    };
}

// ─── Migration table ──────────────────────────────────────────────────────────

const MIGRATIONS: Array<{
    fromKey: string;
    toKey: string;
    upgrade: (raw: unknown[]) => Bill[];
}> = [
    {
        fromKey: 'billtracker_bills', // very first key (standalone HTML app)
        toKey: STORAGE_BILLS,
        upgrade: raw => (raw as BillV2[]).map(upgradeV2ToV3),
    },
    {
        fromKey: 'billfold_bills_v2', // Next.js v2 schema
        toKey: STORAGE_BILLS,
        upgrade: raw => (raw as BillV2[]).map(upgradeV2ToV3),
    },
    {
        fromKey: 'billfold_bills_v3', // pre-rename (billfold → owed)
        toKey: STORAGE_BILLS,
        upgrade: raw => raw as Bill[], // same shape, just copy across
    },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once at app startup (inside useBills).
 * Walks every migration in order. If the source key exists and the
 * destination key is empty, upgrades and migrates the data.
 */
export function runMigrations(): void {
    if (typeof window === 'undefined') return;

    for (const { fromKey, toKey, upgrade } of MIGRATIONS) {
        const oldRaw = localStorage.getItem(fromKey);
        if (!oldRaw) continue; // nothing to migrate from this key

        // Only migrate into the destination if it's currently empty,
        // so we never overwrite bills the user already has there.
        const destRaw = localStorage.getItem(toKey);

        try {
            const oldBills = JSON.parse(oldRaw) as unknown[];
            const upgraded = upgrade(oldBills);

            if (!destRaw) {
                // Destination is empty — migrate everything across
                localStorage.setItem(toKey, JSON.stringify(upgraded));
            } else {
                // Destination already has bills — merge, deduplicating by id
                const existing = JSON.parse(destRaw) as Bill[];
                const existingIds = new Set(existing.map(b => b.id));
                const merged = [
                    ...existing,
                    ...upgraded.filter(b => !existingIds.has(b.id)),
                ];
                localStorage.setItem(toKey, JSON.stringify(merged));
            }

            // Remove the old key so this migration never runs again
            localStorage.removeItem(fromKey);
        } catch (e) {
            console.warn(`Owed: migration from "${fromKey}" failed`, e);
        }
    }
}
