import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// Browser client — uses anon key, respects RLS
export const supabase = createClient(url, anonKey);

// Server client — uses service role key, bypasses RLS
// Only import this in API routes / server components, never in client code
export function createServiceClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, serviceKey);
}
