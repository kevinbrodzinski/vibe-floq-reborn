import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFlowReflection(flowId: string | null) {
  const [summary, setSummary] = React.useState<any>(null);
  const [insights, setInsights] = React.useState<any>(null);
  const [postcardUrl, setPostcardUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!!flowId);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!flowId) return;
    setLoading(true);
    setError(null);
    
    try {
      const [{ data: s, error: e1 }, { data: f, error: e2 }] = await Promise.all([
        supabase.rpc('flow_summary', { _flow_id: flowId }),
        supabase.from('flows').select('insights, postcard_url, reflection_generated_at').eq('id', flowId).maybeSingle()
      ]);
      
      if (e1) throw e1;
      if (e2) throw e2;
      
      setSummary(s);
      setInsights(f?.insights ?? null);
      setPostcardUrl(f?.postcard_url ?? null);
    } catch (e: any) {
      console.error('Failed to load reflection:', e);
      setError(e?.message ?? 'Failed to load reflection');
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  // Lazy generate insights/postcard if missing
  const generate = React.useCallback(async () => {
    if (!flowId) return;
    setLoading(true);
    
    try {
      await Promise.allSettled([
        supabase.functions.invoke('generate-flow-insights', { body: { flowId } }),
        supabase.functions.invoke('generate-postcard', { body: { flowId } })
      ]);
      await refresh();
    } catch (e: any) {
      console.error('Failed to generate insights:', e);
      setError(e?.message ?? 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }, [flowId, refresh]);

  React.useEffect(() => { 
    refresh(); 
  }, [refresh]);

  return { 
    summary, 
    insights, 
    postcardUrl,
    loading, 
    error, 
    refresh, 
    generate 
  };
}