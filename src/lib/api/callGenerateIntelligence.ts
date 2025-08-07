import { supabase } from '@/integrations/supabase/client'
import type { IntelligenceMode, IntelligencePayload } from '@/lib/intelligence/types'

export async function callGenerateIntelligence(
  mode: IntelligenceMode,
  payload: IntelligencePayload
) {
  const { data, error } = await supabase.functions.invoke('generate-intelligence', {
    body: { mode, ...payload },
  })
  
  if (error) {
    // Enhanced error handling for 400/422 responses
    const errorMessage = error.message || 'Unknown error';
    console.error('[Intelligence] Error:', { mode, payload, error: errorMessage });
    throw new Error(`Intelligence generation failed: ${errorMessage}`);
  }
  
  return data
}