import { supabase } from '@/integrations/supabase/client';

export async function callFn<T = unknown>(
  name: string,
  body: Record<string, unknown> = {},
) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const { data, error } = await supabase.functions.invoke<T>(name, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (error) throw error;
  return data;
}