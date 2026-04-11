'use client';

import type { Bill } from './types';

export const STORAGE_NOTIFY_TIME = 'owed_notify_time';
export const DEFAULT_NOTIFY_TIME = '09:00';

export function getSavedNotifyTime(): string {
    if (typeof window === 'undefined') return DEFAULT_NOTIFY_TIME;
    return localStorage.getItem(STORAGE_NOTIFY_TIME) ?? DEFAULT_NOTIFY_TIME;
}

export function saveNotifyTime(time: string) {
    localStorage.setItem(STORAGE_NOTIFY_TIME, time);
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window))
        return 'unsupported';
    return Notification.permission;
}

// ─── Service Worker ───────────────────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
        return await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
        console.error('SW registration failed:', e);
        return null;
    }
}

// ─── Push Subscription ───────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(
        [...rawData].map(c => c.charCodeAt(0)),
    ) as Uint8Array<ArrayBuffer>;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
    const reg = await registerServiceWorker();
    if (!reg) return null;

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return null;

    try {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        // Save subscription to Supabase via API route
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub.toJSON()),
        });

        return sub;
    } catch (e) {
        console.error('Push subscription failed:', e);
        return null;
    }
}

export async function unsubscribeFromPush(): Promise<void> {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) return;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    // Remove from Supabase first
    await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
    });

    await sub.unsubscribe();
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
}

// ─── Bill Sync ────────────────────────────────────────────────────────────────

/**
 * Converts a local HH:MM time string to a UTC HH:MM string using the
 * browser's current timezone offset. The cron job compares against UTC
 * hours, so we must store the time in UTC.
 */
function localTimeToUTC(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    // Build a Date on today's date at the given local clock time
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const utcH = local.getUTCHours();
    const utcM = local.getUTCMinutes();
    return `${String(utcH).padStart(2, '0')}:${String(utcM).padStart(2, '0')}`;
}

/** Call this whenever bills change so the cron job has the latest schedule */
export async function syncBillsToServer(bills: Bill[]): Promise<void> {
    const sub = await getExistingSubscription();
    if (!sub) return; // not subscribed to push, nothing to sync

    try {
        await fetch('/api/push/sync-bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: sub.endpoint,
                bills,
                notifyTime: localTimeToUTC(getSavedNotifyTime()),
            }),
        });
    } catch (e) {
        console.error('Bill sync failed:', e);
    }
}

// ─── Test notification (still useful for immediate feedback) ─────────────────

export async function sendTestNotification(
    billName: string,
    amount: number,
): Promise<void> {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) return;

    // Use showNotification via the service worker so it works even on iOS PWA
    await reg.showNotification('💳 Bill Reminder – Owed', {
        body: `${billName} is due soon — $${amount.toFixed(2)}`,
        tag: 'test-notification',
    });
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatTime12h(time24: string): string {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
