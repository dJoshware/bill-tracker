import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { endpoint } = await req.json();

        if (!endpoint) {
            return NextResponse.json(
                { error: 'Missing endpoint' },
                { status: 400 },
            );
        }

        const supabase = createServiceClient();
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Unsubscribe error:', err);
        return NextResponse.json(
            { error: 'Failed to remove subscription' },
            { status: 500 },
        );
    }
}
