import { supabase } from '@/integrations/supabase/client';

let _cached: {token: string; source: string} | null = null;

export async function getMapboxToken(): Promise<{token: string; source: string}> {
  if (_cached) return _cached;                 // 1. return if memoised

  // 2. edge-function – if this fails we fall through
  try {
    const { data } = await supabase.functions.invoke('mapbox-token');
    if (data?.token) return (_cached = { token: data.token, source: 'edge-function' });
  } catch {/* ignore */}

  // 3. env
  const env =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ??
    (typeof process !== 'undefined' ? process.env.MAPBOX_ACCESS_TOKEN : undefined);
  if (env) return (_cached = { token: env, source: 'env' });

  // 4. fallback
  return (_cached = {
    token: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
    source: 'fallback'
  });
}