import { supabase } from '@/integrations/supabase/client'

export async function callGenerateIntelligence(
  mode: 'afterglow-summary' | 'daily-afterglow' | 'weekly-ai' | 'plan-summary',
  payload: Record<string, any>
) {
  const { data, error } = await supabase.functions.invoke('generate-intelligence', {
    body: { mode, ...payload },
  })
  if (error) throw error
  return data
}