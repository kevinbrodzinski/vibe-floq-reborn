import { supabase } from '@/integrations/supabase/client'

export async function callGenerateIntelligence(
  mode: 'afterglow-summary' | 'daily-afterglow' | 'weekly-ai' | 'plan-summary' | 'shared-activity-suggestions',
  payload: Record<string, any>
) {
  console.log('[callGenerateIntelligence] Invoking with:', { mode, payload });
  
  const { data, error } = await supabase.functions.invoke('generate-intelligence', {
    body: { mode, ...payload },
  })
  
  console.log('[callGenerateIntelligence] Response:', { data, error });
  
  if (error) {
    console.error('[callGenerateIntelligence] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  return data;
}