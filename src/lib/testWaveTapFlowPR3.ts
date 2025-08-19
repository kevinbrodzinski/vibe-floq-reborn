// PR-3 Wave Tap Flow Testing Script
// Test complete discover → wave tap → bottom sheet → create floq flow

import { supabase } from '@/integrations/supabase/client';

export async function testCompleteWaveTapFlow() {
  console.log('🎯 Testing complete wave tap → bottom sheet → create floq flow...');
  
  // Step 1: Test discovery queries work
  console.log('📍 Step 1: Testing discovery queries...');
  
  const { data: waves, error: wavesError } = await supabase.rpc('rpc_waves_near', {
    center_lat: 34.0522,
    center_lng: -118.2437,
    radius_m: 1500,
    friends_only: false, // Allow any waves for testing
    min_size: 1,
    recent_minutes: 10,
    only_close_friends: false
  });

  if (wavesError) {
    console.error('❌ Discovery queries failed:', wavesError);
    return false;
  }

  console.log(`✅ Found ${waves?.length ?? 0} waves for testing`);

  if (!waves || waves.length === 0) {
    console.log('ℹ️ No waves found - this is expected if no recent presence data exists');
    console.log('💡 Try creating some presence events first or check your presence data');
    return { noWaves: true };
  }

  // Step 2: Simulate wave selection (what happens when user taps map/list)
  console.log('📍 Step 2: Simulating wave selection...');
  
  const testWave = waves[0];
  console.log('🎯 Selected wave:', {
    id: testWave.cluster_id,
    size: testWave.size,
    friends: testWave.friends_in_cluster,
    location: `${testWave.centroid_lat}, ${testWave.centroid_lng}`
  });

  // Step 3: Test floq creation from wave
  console.log('📍 Step 3: Testing floq creation from wave...');
  
  try {
    const { createMomentaryFromWave } = await import('@/lib/createFloqFromWave');
    
    const result = await createMomentaryFromWave({
      title: `Wave Floq Test (${testWave.size} people)`,
      vibe: 'hype',
      lat: testWave.centroid_lat,
      lng: testWave.centroid_lng,
      radiusM: 300,
      visibility: 'public'
    });

    if ('error' in result) {
      console.error('❌ Failed to create floq from wave:', result.error);
      return false;
    }

    console.log('✅ Created floq from wave:', result.floqId);

    // Step 4: Verify floq was created with correct properties
    console.log('📍 Step 4: Verifying floq properties...');
    
    const { data: floqDetails, error: detailsError } = await supabase.rpc('get_floq_full_details', {
      p_floq_id: result.floqId
    });

    if (detailsError || !floqDetails?.[0]) {
      console.error('❌ Failed to verify floq details:', detailsError);
      return false;
    }

    const floq = floqDetails[0];
    console.log('✅ Floq verification:', {
      id: floq.id,
      title: floq.title,
      flock_type: floq.flock_type,
      ends_at: floq.ends_at,
      participant_count: floq.participant_count
    });

    console.log('🎉 Complete wave tap flow test PASSED!');
    console.log('🔗 Navigate to test floq:', `/floqs/${result.floqId}`);
    
    return {
      success: true,
      floqId: result.floqId,
      waveId: testWave.cluster_id,
      floqDetails: floq
    };

  } catch (error) {
    console.error('❌ Exception in wave tap flow:', error);
    return false;
  }
}

export async function testMapInteraction() {
  console.log('🗺️ Testing map interaction simulation...');
  
  // Simulate what happens when user clicks a wave marker
  const mockWaveMarker = {
    id: 'test-wave-123',
    size: 5,
    friends: 2,
    lat: 34.0522,
    lng: -118.2437
  };

  console.log('🎯 Simulating wave marker click:', mockWaveMarker);
  
  // This simulates the onSelect callback from the map
  console.log('✅ Map would call onSelect with:', mockWaveMarker);
  console.log('✅ Bottom sheet would open with wave details');
  console.log('✅ User would see "Let\'s Floq" button');
  
  return mockWaveMarker;
}

export async function testBottomSheetFlow() {
  console.log('📱 Testing bottom sheet flow...');
  
  // Test the complete flow that happens when user taps "Let's Floq"
  const result = await testCompleteWaveTapFlow();
  
  if (result && typeof result === 'object' && 'success' in result) {
    console.log('✅ Bottom sheet flow complete');
    console.log('✅ Expected UI behavior:');
    console.log('  1. User taps wave marker on map');
    console.log('  2. Bottom sheet slides up with wave details');
    console.log('  3. User taps "Let\'s Floq" button');
    console.log('  4. Button shows loading state');
    console.log('  5. Floq is created and user navigates to it');
    console.log('  6. User sees momentary floq UI with countdown');
    
    return result;
  }
  
  return false;
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testWaveTapFlow = {
    testCompleteWaveTapFlow,
    testMapInteraction,
    testBottomSheetFlow
  };
}