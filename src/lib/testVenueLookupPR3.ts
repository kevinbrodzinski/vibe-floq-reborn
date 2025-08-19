// PR-3 Venue Lookup Testing Script
// Test nearest venue RPC and venue-aware floq creation

import { supabase } from '@/integrations/supabase/client';

export async function testNearestVenueRPC(lat: number = 34.0522, lng: number = -118.2437) {
  console.log('🏢 Testing nearest venue RPC at:', lat, lng);
  
  try {
    const { data, error } = await supabase.rpc('rpc_nearest_venue', {
      in_lat: lat,
      in_lng: lng,
      in_max_distance_m: 200
    });

    if (error) {
      console.error('❌ Nearest venue RPC failed:', error);
      return false;
    }

    const venue = data?.[0];
    if (venue) {
      console.log('✅ Found nearest venue:', {
        id: venue.venue_id,
        name: venue.name,
        distance: `${venue.distance_m}m`,
        location: `${venue.lat}, ${venue.lng}`
      });
      return venue;
    } else {
      console.log('ℹ️ No venue found within 200m - this is normal for non-urban areas');
      return null;
    }
  } catch (error) {
    console.error('❌ Exception testing nearest venue:', error);
    return false;
  }
}

export async function testVenueAwareFloqCreation() {
  console.log('🎯 Testing venue-aware floq creation...');
  
  // First find a venue
  const venue = await testNearestVenueRPC();
  
  const testCoords = { lat: 34.0522, lng: -118.2437 };
  const payload = venue ? {
    venueId: venue.venue_id,
    name: venue.name,
    lat: venue.lat,
    lng: venue.lng
  } : {
    venueId: undefined,
    name: undefined,
    lat: testCoords.lat,
    lng: testCoords.lng
  };

  console.log('🏗️ Creating floq with payload:', payload);

  try {
    const { createMomentaryFromWave } = await import('@/lib/createFloqFromWave');
    
    const result = await createMomentaryFromWave({
      title: payload.name ? `Floq at ${payload.name}` : 'Wave Floq',
      vibe: 'hype',
      lat: payload.lat,
      lng: payload.lng,
      radiusM: 300,
    });

    if ('error' in result) {
      console.error('❌ Failed to create venue-aware floq:', result.error);
      return false;
    }

    console.log('✅ Created venue-aware floq:', result.floqId);
    console.log('🏢 Venue context:', venue ? `at ${venue.name}` : 'no specific venue');
    console.log('🔗 Navigate to:', `/floqs/${result.floqId}`);
    
    return {
      floqId: result.floqId,
      venue,
      payload
    };
  } catch (error) {
    console.error('❌ Exception creating venue-aware floq:', error);
    return false;
  }
}

export async function testCompleteVenueFlow() {
  console.log('🎯 Testing complete venue lookup flow...');
  console.log('👀 This simulates: Wave tap → Venue lookup → "Let\'s Floq at {Venue}"');
  
  // Test 1: Venue RPC
  console.log('📍 Step 1: Testing venue lookup...');
  const venue = await testNearestVenueRPC();
  
  // Test 2: Venue-aware creation
  console.log('📍 Step 2: Testing venue-aware floq creation...');
  const result = await testVenueAwareFloqCreation();
  
  if (result && typeof result === 'object') {
    console.log('🎉 Complete venue flow test PASSED!');
    console.log('✅ Expected UI behavior:');
    console.log('  1. User taps wave on map');
    console.log('  2. Bottom sheet shows wave details');
    console.log('  3. User taps "Continue"');
    console.log('  4. Second sheet shows venue lookup with spinner');
    console.log('  5. CTA updates to "Let\'s Floq at {Venue}" or "Let\'s Floq here"');
    console.log('  6. User taps CTA → floq created with venue context');
    console.log('  7. User navigates to momentary floq UI');
    
    return result;
  }
  
  return false;
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testVenueLookup = {
    testNearestVenueRPC,
    testVenueAwareFloqCreation,
    testCompleteVenueFlow
  };
}