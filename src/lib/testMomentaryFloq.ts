// Test helper for momentary floq integration
// This can be used in browser console to test the flow

import { supabase } from '@/integrations/supabase/client';

export async function createTestMomentaryFloq() {
  try {
    console.log('Creating test momentary floq...');
    
    // Create a momentary floq using the RPC (4 hour duration makes it momentary)
    const { data: floqId, error } = await supabase.rpc('create_momentary_floq', {
      in_primary_vibe: 'hype',
      in_title: 'Test Momentary Floq',
      in_lat: 34.0522,
      in_lng: -118.2437,
      in_radius_m: 500,
      in_visibility: 'public',
    });

    if (error) {
      console.error('Error creating floq:', error);
      return null;
    }

    console.log('✅ Created momentary floq:', floqId);
    console.log('🔗 Navigate to:', `/floqs/${floqId}`);
    
    return floqId;
  } catch (error) {
    console.error('Failed to create test floq:', error);
    return null;
  }
}

export async function testSessionJoin(floqId: string) {
  try {
    console.log('Joining session...');
    const { error } = await supabase.rpc('update_floq_checkin', {
      in_floq_id: floqId,
      in_checkin: 'here'
    });

    if (error) {
      console.error('Error joining session:', error);
      return false;
    }

    console.log('✅ Joined session successfully');
    return true;
  } catch (error) {
    console.error('Failed to join session:', error);
    return false;
  }
}

export async function testSessionPost(floqId: string, text: string = 'Test message from PR-1') {
  try {
    console.log('Posting to session feed...');
    const { error } = await supabase.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'text',
      in_storage_key: null,
      in_text: text,
      in_duration_sec: null
    });

    if (error) {
      console.error('Error posting to session:', error);
      return false;
    }

    console.log('✅ Posted to session feed successfully');
    return true;
  } catch (error) {
    console.error('Failed to post to session:', error);
    return false;
  }
}

// Full test flow
export async function runMomentaryFloqTest() {
  console.log('🧪 Starting momentary floq test...');
  
  const floqId = await createTestMomentaryFloq();
  if (!floqId) return;

  // Wait a moment for the floq to be created
  await new Promise(resolve => setTimeout(resolve, 1000));

  const joined = await testSessionJoin(floqId);
  if (!joined) return;

  // Wait a moment then post a message
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const posted = await testSessionPost(floqId);
  if (!posted) return;

  console.log('🎉 All tests passed! Check the UI at:', `/floqs/${floqId}`);
  return floqId;
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testMomentaryFloq = {
    createTestMomentaryFloq,
    testSessionJoin,
    testSessionPost,
    runMomentaryFloqTest
  };
}