import { supabase } from '@/integrations/supabase/client';

export async function supaFn(path: string, accessToken: string | null, body: unknown) {
  // Use the official Supabase client to avoid CORS issues
  const { data, error } = await supabase.functions.invoke(path, {
    body,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (error) {
    // Create a Response-like object for backward compatibility
    return {
      ok: false,
      status: error.status || 500,
      text: async () => error.message,
      json: async () => ({ error: error.message }),
    };
  }

  // Create a Response-like object for backward compatibility
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
    json: async () => data,
  };
}