import { createClient } from '@supabase/supabase-js';

const supabaseRemoteUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseRemoteUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Project Settings.'
  );
}

const proxyFetch: typeof fetch = async (input, init) => {
  const inputUrl =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (!import.meta.env.DEV || !inputUrl.startsWith(supabaseRemoteUrl)) {
    return fetch(input, init);
  }

  const url = new URL(inputUrl);
  const proxyUrl = `/supabase${url.pathname}${url.search}`;

  if (input instanceof Request) {
    return fetch(new Request(proxyUrl, input), init);
  }

  return fetch(proxyUrl, init);
};

export const supabase = createClient(supabaseRemoteUrl, supabaseAnonKey, {
  global: {
    fetch: proxyFetch,
  },
});
