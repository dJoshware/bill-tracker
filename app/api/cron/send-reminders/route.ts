import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
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
        // Figure out which month this bill is active in
        if (bill.recurrence === 'once') {
            const [y, m] = (bill.monthKey ?? '').split('-').map(Number);
            if (y !== todayYear || m !== todayMonth) return false;
        }
        if (bill.recurrence === 'yearly') {
            if (bill.dueMonth !== todayMonth) return false;
        }

        // The day the reminder should fire
        const reminderDay = bill.dueDay - bill.notifyDaysBefore;
        return reminderDay === todayDate;
    });
}

export async function GET(req: NextRequest) {
    // Protect the cron endpoint from unauthorized calls
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch all push subscriptions
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

    // Fetch bills from localStorage isn't possible server-side, so bills
    // are posted to this endpoint from the client when they change.
    // Read them from Supabase instead.
    const { data: billRows, error: billError } = await supabase
        .from('bills')
        .select('data');

    if (billError) {
        console.error('Failed to fetch bills:', billError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    const allBills: Bill[] = (billRows ?? []).flatMap(row => row.data ?? []);
    const billsDue = getBillsDueForReminder(allBills);

    if (billsDue.length === 0) {
        return NextResponse.json({
            sent: 0,
            message: 'No reminders due today',
        });
    }

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        for (const bill of billsDue) {
            const body =
                bill.notifyDaysBefore === 0
                    ? `${bill.name} is due today — $${bill.amount.toFixed(2)}`
                    : `${bill.name} is due in ${bill.notifyDaysBefore} day${bill.notifyDaysBefore > 1 ? 's' : ''} — $${bill.amount.toFixed(2)}`;

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
                // 404/410 means the subscription is expired — clean it up
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
        expired: expiredEndpoints.length,
    });
}
