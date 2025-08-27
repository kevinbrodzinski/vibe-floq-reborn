// PR-3 Discovery Testing Script
// Test wave discovery and map integration

import { supabase } from '@/integrations/supabase/client';

export async function testWaveDiscovery(lat: number = 34.0522, lng: number = -118.2437) {
  console.log('🧪 Testing wave discovery at:', lat, lng);
  
  try {
    // Test waves near
    const { data: waves, error: wavesError } = await supabase.rpc('rpc_waves_near', {
      center_lat: lat,
      center_lng: lng,
      radius_m: 1500,
      friends_only: true,
      min_size: 3,
      recent_minutes: 3,
      only_close_friends: false
    });

    if (wavesError) {
      console.error('❌ Waves query failed:', wavesError);
      return false;
    }

    console.log('✅ Found waves:', waves?.length ?? 0);
    
    // Test ripples near
    const { data: ripples, error: ripplesError } = await supabase.rpc('rpc_ripples_near', {
      center_lat: lat,
      center_lng: lng,
      radius_m: 1500,
      friends_only: false,
      recent_minutes: 15,
      only_close_friends: false
    });

    if (ripplesError) {
      console.error('❌ Ripples query failed:', ripplesError);
      return false;
    }

    console.log('✅ Found ripples:', ripples?.length ?? 0);

    // Test overview
    const { data: overview, error: overviewError } = await supabase.rpc('rpc_wave_ripple_overview', {
      center_lat: lat,
      center_lng: lng,
      radius_m: 1500,
      recent_wave_minutes: 3,
      recent_ripple_minutes: 15,
      only_close_friends: false
    });

    if (overviewError) {
      console.error('❌ Overview query failed:', overviewError);
      return false;
    }

    console.log('✅ Overview:', overview?.[0]);
    
    return {
      waves: waves?.length ?? 0,
      ripples: ripples?.length ?? 0,
      overview: overview?.[0]
    };
  } catch (error) {
    console.error('❌ Exception testing discovery:', error);
    return false;
  }
}

export async function testCreateFloqFromWave() {
  console.log('🧪 Testing create floq from wave...');
  
  // First find a wave
  const discovery = await testWaveDiscovery();
  if (!discovery || typeof discovery === 'boolean') {
    console.log('❌ No waves found to test with');
    return false;
  }

  // Get waves data to find one to test with
  const { data: waves } = await supabase.rpc('rpc_waves_near', {
    center_lat: 34.0522,
    center_lng: -118.2437,
    radius_m: 1500,
    friends_only: false, // Allow any wave for testing
    min_size: 1, // Lower threshold for testing
    recent_minutes: 10,
    only_close_friends: false
  });

  const testWave = waves?.[0];
  if (!testWave) {
    console.log('❌ No waves available for testing');
    return false;
  }

  console.log('🎯 Testing with wave:', testWave.cluster_id);

  try {
    const { createMomentaryFromWave } = await import('@/lib/createFloqFromWave');
    
    const result = await createMomentaryFromWave({
      title: 'Test Discovery Floq',
      vibe: 'hype',
      lat: testWave.centroid_lat,
      lng: testWave.centroid_lng,
      radiusM: 300,
      visibility: 'public'
    });

    if ('error' in result) {
      console.error('❌ Failed to create floq:', result.error);
      return false;
    }

    console.log('✅ Created floq from wave:', result.floqId);
    console.log('🔗 Navigate to:', `/floqs/${result.floqId}`);
    
    return result.floqId;
  } catch (error) {
    console.error('❌ Exception creating floq from wave:', error);
    return false;
  }
}

export async function fullDiscoveryTest() {
  console.log('🎯 Starting full PR-3 discovery test...');
  
  // Test 1: Discovery queries
  const discovery = await testWaveDiscovery();
  if (!discovery) return false;

  // Test 2: Create floq from wave
  const floqId = await testCreateFloqFromWave();
  if (!floqId) return false;

  console.log('🎉 PR-3 discovery test complete!');
  console.log('✅ Expected behavior:');
  console.log('  - /discover page shows waves and ripples');
  console.log('  - Map shows colored circles for waves');
  console.log('  - Clicking "Let\'s Floq" creates momentary floq');
  console.log('  - Auto-navigates to new floq with momentary UI');
  
  return floqId;
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testDiscoveryPR3 = {
    testWaveDiscovery,
    testCreateFloqFromWave,
    fullDiscoveryTest
  };
}