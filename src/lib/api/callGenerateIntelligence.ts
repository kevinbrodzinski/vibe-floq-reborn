import { supabase } from '@/integrations/supabase/client'

interface GenerateIntelligencePayload {
  // Common parameters
  prompt?: string;
  temperature?: number;
  max_tokens?: number;
  
  // Mode-specific parameters
  user_id?: string;
  plan_id?: string;
  floq_id?: string;
  date?: string;
  afterglow_id?: string;
  plan_mode?: 'finalized' | 'afterglow';
}

export async function callGenerateIntelligence(
  mode: 'afterglow' | 'daily' | 'weekly' | 'plan' | 'floq-match' | 'shared-activity-suggestions',
  payload: GenerateIntelligencePayload
) {
  const { data, error } = await supabase.functions.invoke('generate-intelligence', {
    body: { mode, ...payload },
  })
  
  if (error) throw error
  return data
}