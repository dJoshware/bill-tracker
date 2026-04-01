'use client';

import type { Bill } from './types';

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

    bills.forEach(bill => {
        if (!bill.recurring && bill.monthKey !== monthKey) return;

        const notifyDate = new Date(
            year,
            month,
            bill.dueDay - bill.notifyDaysBefore,
        );
        const msUntilNotify = notifyDate.getTime() - today.getTime();

        if (msUntilNotify > 0 && msUntilNotify < 7 * 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                const body =
                    bill.notifyDaysBefore === 0
                        ? `${bill.name} is due today — $${bill.amount.toFixed(2)}`
                        : `${bill.name} is due in ${bill.notifyDaysBefore} day${bill.notifyDaysBefore > 1 ? 's' : ''} — $${bill.amount.toFixed(2)}`;

                new Notification('💳 Bill Reminder – Billfold', {
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
    new Notification('💳 Bill Reminder – Billfold', {
        body: `${billName} is due soon — $${amount.toFixed(2)}`,
        tag: 'test-notification',
    });
}
