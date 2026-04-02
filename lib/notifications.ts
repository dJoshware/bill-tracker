'use client';

import type { Bill } from './types';

export const STORAGE_NOTIFY_TIME = 'owed_notify_time'; // "HH:MM" 24hr
export const DEFAULT_NOTIFY_TIME = '09:00';

export function getSavedNotifyTime(): string {
    if (typeof window === 'undefined') return DEFAULT_NOTIFY_TIME;
    return localStorage.getItem(STORAGE_NOTIFY_TIME) ?? DEFAULT_NOTIFY_TIME;
}

export function saveNotifyTime(time: string) {
    localStorage.setItem(STORAGE_NOTIFY_TIME, time);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        return reg;
    } catch (e) {
        console.error('SW registration failed:', e);
        return null;
    }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window))
        return 'unsupported';
    return Notification.permission;
}

export function scheduleBillReminders(bills: Bill[], monthKey: string) {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const today = new Date();
    const [year, month] = monthKey.split('-').map(Number);

    const savedTime = getSavedNotifyTime();
    const [prefHour, prefMinute] = savedTime.split(':').map(Number);

    bills.forEach(bill => {
        // Skip bills that don't belong to this month view
        if (bill.recurrence === 'once' && bill.monthKey !== monthKey) return;
        if (bill.recurrence === 'yearly' && bill.dueMonth !== month) return;

        // Build the fire date: due day minus the advance notice, at the chosen time
        const notifyDate = new Date(
            year,
            month,
            bill.dueDay - bill.notifyDaysBefore,
        );
        notifyDate.setHours(prefHour, prefMinute, 0, 0);

        const msUntilNotify = notifyDate.getTime() - today.getTime();

        // Only schedule if it fires in the future and within the next 7 days
        if (msUntilNotify > 0 && msUntilNotify < 7 * 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                const body =
                    bill.notifyDaysBefore === 0
                        ? `${bill.name} is due today — $${bill.amount.toFixed(2)}`
                        : `${bill.name} is due in ${bill.notifyDaysBefore} day${bill.notifyDaysBefore > 1 ? 's' : ''} — $${bill.amount.toFixed(2)}`;

                new Notification('💳 Bill Reminder', {
                    body,
                    tag: bill.id,
                });
            }, msUntilNotify);
        }
    });
}

export function sendTestNotification(billName: string, amount: number) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification('💳 Bill Reminder', {
        body: `${billName} is due soon — $${amount.toFixed(2)}`,
        tag: 'test-notification',
    });
}

// Format "09:00" → "9:00 AM", "14:30" → "2:30 PM"
export function formatTime12h(time24: string): string {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
