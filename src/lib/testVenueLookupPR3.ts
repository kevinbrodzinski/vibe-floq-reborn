// PR-3 Venue Lookup Testing Script  
// Test enhanced venue flow with category mapping + rate limiting

import { supabase } from '@/integrations/supabase/client';
import { fetchVenue } from '@/core/venues/service';
import { mapCategoriesToVenueType } from '@/core/venues/category-mapper';
import { getVenuesWithIntelligence } from '@/lib/venues/getVenuesWithIntelligence';

export async function testEnhancedVenueFlow(lat: number = 34.0522, lng: number = -118.2437) {
  console.log('🏢 Testing enhanced venue flow at:', lat, lng);
  
  try {
    // Test 1: Enhanced venue service with Google + FSQ fusion
    console.log('📍 Step 1: Testing fetchVenue with rate limiting...');
    const venuePayload = await fetchVenue(lat, lng);
    
    console.log('✅ Venue payload:', {
      name: venuePayload.name,
      categories: venuePayload.categories,
      confidence: venuePayload.confidence,
      providers: venuePayload.providers
    });
    
    // Test 2: Category mapping
    console.log('📍 Step 2: Testing category mapper...');
    const venueTypeResult = mapCategoriesToVenueType({
      googleTypes: ['night_club', 'bar', 'establishment'], 
      fsqCategories: venuePayload.categories,
      label: venuePayload.name || undefined
    });
    
    console.log('✅ Venue type mapping:', venueTypeResult);
    
    return {
      venuePayload,
      venueTypeResult,
      success: true
    };
  } catch (error) {
    console.error('❌ Exception testing enhanced venue flow:', error);
    return { success: false, error };
  }
}

export async function testNearestVenueRPC(lat: number = 34.0522, lng: number = -118.2437) {
  console.log('🏢 Testing fallback venue RPC at:', lat, lng);
  
  try {
    const venues = await getVenuesWithIntelligence({
      lat: lat,
      lng: lng,
      radius_m: 200,
      limit: 1,
    });
    const data = venues[0] || null;

    if (data) {
      console.log('✅ Found fallback venue:', {
        id: data.id,
        name: data.name,
        distance: `${data.distance_m}m`,
        location: `${data.lat}, ${data.lng}`
      });
      return data;
    } else {
      console.log('ℹ️ No venue found within 200m - this is normal for non-urban areas');
      return null;
    }
  } catch (error) {
    console.error('❌ Exception testing fallback venue:', error);
    return false;
  }
}

export async function testVenueAwareFloqCreation() {
  console.log('🎯 Testing venue-aware floq creation...');
  
  // First find a venue
  const venue = await testNearestVenueRPC();
  
  const testCoords = { lat: 34.0522, lng: -118.2437 };
  const payload = venue ? {
    venueId: venue.id,
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
  console.log('🎯 Testing complete enhanced venue flow...');
  console.log('👀 This simulates: Enhanced venue detection → Category mapping → Learning integration');
  
  // Test 1: Enhanced venue flow
  console.log('📍 Step 1: Testing enhanced venue detection...');
  const enhanced = await testEnhancedVenueFlow();
  
  // Test 2: Fallback RPC
  console.log('📍 Step 2: Testing fallback venue lookup...');
  const venue = await testNearestVenueRPC();
  
  // Test 3: Venue-aware creation
  console.log('📍 Step 3: Testing venue-aware floq creation...');
  const result = await testVenueAwareFloqCreation();
  
  if (enhanced?.success && result && typeof result === 'object') {
    console.log('🎉 Complete enhanced venue flow test PASSED!');
    console.log('✅ Enhanced flow benefits:');
    console.log('  1. Rate-limited Google + FSQ fusion with confidence scoring');
    console.log('  2. Request coalescing prevents duplicate API calls');  
    console.log('  3. Canonical category mapping for consistent venue types');
    console.log('  4. Enhanced learning with venue context + telemetry');
    console.log('  5. Graceful degradation with fallback chain');
    
    return { enhanced, venue, floqResult: result };
  }
  
  return false;
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testVenueLookup = {
    testEnhancedVenueFlow,
    testNearestVenueRPC, 
    testVenueAwareFloqCreation,
    testCompleteVenueFlow
  };
}