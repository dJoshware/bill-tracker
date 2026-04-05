import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { endpoint, bills, notifyTime } = await req.json();

        if (!endpoint || !Array.isArray(bills)) {
            return NextResponse.json(
                { error: 'Missing endpoint or bills' },
                { status: 400 },
            );
        }

        const supabase = createServiceClient();
        const { error } = await supabase.from('bills').upsert(
            {
                endpoint,
                data: bills,
                notify_time: notifyTime ?? '09:00',
            },
            { onConflict: 'endpoint' },
        );

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Sync bills error:', err);
        return NextResponse.json(
            { error: 'Failed to sync bills' },
            { status: 500 },
        );
    }
}
