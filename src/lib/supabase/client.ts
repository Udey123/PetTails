import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'your-supabase-url') {
    // Return a mock client that won't crash during build
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key');
  }

  return createBrowserClient(url, key);
}
