import { NextRequest, NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase';
import type { Bill } from '@/lib/types';

webpush.setVapidDetails(
    'mailto:owed-app@notifications.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

function getBillsDueForReminder(bills: Bill[]): Bill[] {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return bills.filter(bill => {
        if (bill.recurrence === 'once') {
            const [y, m] = (bill.monthKey ?? '').split('-').map(Number);
            if (y !== todayYear || m !== todayMonth) return false;
        }
        if (bill.recurrence === 'yearly') {
            if (bill.dueMonth !== todayMonth) return false;
        }

        const reminderDay = bill.dueDay - bill.notifyDaysBefore;
        if (reminderDay < 1) return false;
        return reminderDay === todayDate;
    });
}

/**
 * Returns true if this cron run should send notifications for this row.
 *
 * Rules:
 * - Never send twice on the same calendar day (last_sent_date guard)
 * - Send on the first cron run where the current UTC hour >= preferred hour
 *
 * This means if you set 9 AM at 9:23 AM, the 10:00 AM cron is the first
 * run at-or-after 9, hasn't sent today yet, so it fires. ✅
 */
function shouldSendNow(
    preferredTime: string,
    lastSentDate: string | null,
): boolean {
    const [prefHour] = preferredTime.split(':').map(Number);
    const now = new Date();
    const todayUTC = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Already sent today — don't send again
    if (lastSentDate === todayUTC) return false;

    // Send on any cron run at or after the preferred hour
    return now.getUTCHours() >= prefHour;
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*');

    if (subError) {
        console.error('Failed to fetch subscriptions:', subError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({ sent: 0, message: 'No subscriptions' });
    }

    const { data: billRows, error: billError } = await supabase
        .from('bills')
        .select('endpoint, data, notify_time, last_sent_date');

    if (billError) {
        console.error('Failed to fetch bills:', billError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const expiredEndpoints: string[] = [];
    const sentEndpoints: string[] = [];

    for (const row of billRows ?? []) {
        const notifyTime: string = row.notify_time ?? '09:00';
        const lastSentDate: string | null = row.last_sent_date ?? null;

        if (!shouldSendNow(notifyTime, lastSentDate)) {
            skipped++;
            continue;
        }

        const bills: Bill[] = row.data ?? [];
        const billsDue = getBillsDueForReminder(bills);
        if (billsDue.length === 0) continue;

        const sub = subscriptions.find(s => s.endpoint === row.endpoint);
        if (!sub) continue;

        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        for (const bill of billsDue) {
            const body =
                bill.notifyDaysBefore === 0
                    ? `${bill.name} is due today — $${bill.amount.toFixed(2)}`
                    : bill.notifyDaysBefore === 1
                      ? `${bill.name} is due tomorrow — $${bill.amount.toFixed(2)}`
                      : `${bill.name} is due in ${bill.notifyDaysBefore} days — $${bill.amount.toFixed(2)}`;

            const payload = JSON.stringify({
                title: '💳 Bill Reminder',
                body,
                tag: bill.id,
                url: '/',
            });

            try {
                await webpush.sendNotification(pushSubscription, payload);
                sent++;
                // Track that we sent for this endpoint today
                if (!sentEndpoints.includes(row.endpoint)) {
                    sentEndpoints.push(row.endpoint);
                }
            } catch (err: unknown) {
                if (
                    err &&
                    typeof err === 'object' &&
                    'statusCode' in err &&
                    (err.statusCode === 404 || err.statusCode === 410)
                ) {
                    expiredEndpoints.push(sub.endpoint);
                } else {
                    console.error('Push send failed:', err);
                    failed++;
                }
            }
        }
    }

    // Mark today's date on all rows that successfully sent
    const todayUTC = new Date().toISOString().slice(0, 10);
    if (sentEndpoints.length > 0) {
        await supabase
            .from('bills')
            .update({ last_sent_date: todayUTC })
            .in('endpoint', sentEndpoints);
    }

    // Remove expired subscriptions
    if (expiredEndpoints.length > 0) {
        await supabase
            .from('push_subscriptions')
            .delete()
            .in('endpoint', expiredEndpoints);
    }

    return NextResponse.json({
        sent,
        failed,
        skipped,
        expired: expiredEndpoints.length,
    });
}
