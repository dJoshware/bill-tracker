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
        if (reminderDay < 1) return false; // crosses month boundary, skip
        return reminderDay === todayDate;
    });
}

/** Returns true if the current UTC hour matches the preferred hour */
function isWithinNotifyWindow(preferredTime: string): boolean {
    const [prefHour] = preferredTime.split(':').map(Number);
    return new Date().getUTCHours() === prefHour;
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
        .select('endpoint, data, notify_time');

    if (billError) {
        console.error('Failed to fetch bills:', billError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const expiredEndpoints: string[] = [];

    for (const row of billRows ?? []) {
        // Each row has a preferred notify_time saved alongside the bills
        const notifyTime: string = row.notify_time ?? '09:00';

        // Skip this subscriber if we're not in their notify window yet
        if (!isWithinNotifyWindow(notifyTime)) {
            skipped++;
            continue;
        }

        const bills: Bill[] = row.data ?? [];
        const billsDue = getBillsDueForReminder(bills);
        if (billsDue.length === 0) continue;

        // Find the subscription for this row's endpoint
        const sub =
            subscriptions.find(s =>
                bills.some(() => s.endpoint === row.endpoint),
            ) ?? subscriptions[0];

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
