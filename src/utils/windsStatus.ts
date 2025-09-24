import { supabase } from '@/integrations/supabase/client';

/**
 * Check winds pipeline status for debugging
 */
export async function checkWindsStatus() {
  if (!import.meta.env.DEV) return;
  
  try {
    console.group('🌊 Winds Pipeline Status');
    
    // Check flow_samples count
    const { data: samplesData, error: samplesError } = await supabase
      .from('flow_samples')
      .select('*', { count: 'exact', head: true });
    
    if (samplesError) {
      console.error('❌ flow_samples error:', samplesError);
    } else {
      console.log(`📊 flow_samples: ${samplesData?.length || 0} records`);
    }
    
    // Check trade_winds count
    const { data: windsData, error: windsError } = await supabase
      .from('trade_winds')
      .select('*', { count: 'exact', head: true });
    
    if (windsError) {
      console.error('❌ trade_winds error:', windsError);
    } else {
      console.log(`🌬️ trade_winds: ${windsData?.length || 0} paths`);
    }
    
    // Check recent samples
    const { data: recentSamples, error: recentError } = await supabase
      .from('flow_samples')
      .select('hour_bucket, dow, cell_x, cell_y, vx, vy, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(5);
    
    if (!recentError && recentSamples?.length) {
      console.log('🕐 Recent samples:', recentSamples);
    }
    
    console.groupEnd();
  } catch (e) {
    console.error('❌ Status check failed:', e);
  }
}

// Expose globally for dev console
if (import.meta.env.DEV) {
  (window as any).checkWindsStatus = checkWindsStatus;
}