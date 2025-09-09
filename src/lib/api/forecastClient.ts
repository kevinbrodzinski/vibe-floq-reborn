import { supabase } from '@/integrations/supabase/client';
import type { PressureCell } from '@/lib/api/mapContracts';

export type ForecastInput = { t: 'now' | 'p30' | 'p120' | 'historic'; range?: string; center?: [number,number]; bbox?: [number,number,number,number]; zoom: number };
export type ForecastResp = { cells: PressureCell[]; insights?: string[]; ttlSec: number };

export async function fetchForecast(input: ForecastInput): Promise<ForecastResp> {
  const { data, error } = await supabase.functions.invoke<ForecastResp>('social-forecast', { body: input });
  if (error) throw error;
  return data!;
}