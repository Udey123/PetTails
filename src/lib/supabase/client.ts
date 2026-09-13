import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'your-supabase-url' || key === 'your-supabase-anon-key') {
    // Return a mock client for development without Supabase
    if (!client) {
      client = createBrowserClient('https://placeholder.supabase.co', 'placeholder-anon-key');
    }
    return client;
  }

  if (!client) {
    client = createBrowserClient(url, key);
  }
  return client;
}
