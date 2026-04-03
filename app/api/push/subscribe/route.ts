import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json(
                { error: 'Missing required subscription fields' },
                { status: 400 },
            );
        }

        const supabase = createServiceClient();

        const { error } = await supabase.from('push_subscriptions').upsert(
            {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            { onConflict: 'endpoint' },
        );

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Subscribe error:', err);
        return NextResponse.json(
            { error: 'Failed to save subscription' },
            { status: 500 },
        );
    }
}
