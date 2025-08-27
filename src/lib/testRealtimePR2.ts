// PR-2 Realtime Testing Script
// Test realtime subscriptions for momentary floqs

import { supabase } from '@/integrations/supabase/client';

export async function testRealtimeParticipants(floqId: string) {
  console.log('🧪 Testing realtime participants for floq:', floqId);
  
  // Test 1: Join the floq (should trigger participant update)
  try {
    const { error } = await supabase.rpc('rpc_session_join', {
      in_floq_id: floqId,
      in_status: 'here'
    });
    
    if (error) {
      console.error('❌ Failed to join floq:', error);
      return false;
    }
    
    console.log('✅ Joined floq successfully - check if avatar appears live');
    return true;
  } catch (error) {
    console.error('❌ Exception joining floq:', error);
    return false;
  }
}

export async function testRealtimeFeed(floqId: string) {
  console.log('🧪 Testing realtime feed for floq:', floqId);
  
  // Test 1: Post a text message (should appear live in feed)
  try {
    const { error } = await supabase.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'text',
      in_storage_key: null,
      in_text: `Realtime test message at ${new Date().toLocaleTimeString()}`,
      in_duration_sec: null
    });
    
    if (error) {
      console.error('❌ Failed to post message:', error);
      return false;
    }
    
    console.log('✅ Posted message - check if it appears live in feed');
    
    // Test 2: Post a vibe (should also appear live)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: vibeError } = await supabase.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'vibe',
      in_storage_key: null,
      in_text: 'Realtime vibe test 🔥',
      in_duration_sec: null
    });
    
    if (vibeError) {
      console.error('❌ Failed to post vibe:', vibeError);
      return false;
    }
    
    console.log('✅ Posted vibe - check if it appears live in feed');
    return true;
  } catch (error) {
    console.error('❌ Exception posting to feed:', error);
    return false;
  }
}

export async function testSubscriptionChannels(floqId: string) {
  console.log('🧪 Testing subscription channels for floq:', floqId);
  
  // Test the channels that should be active
  const channels = supabase.getChannels();
  console.log('📡 Active channels:', channels.map(ch => ch.topic));
  
  const expectedChannels = [
    `feed-${floqId}`,
    `participants-${floqId}`
  ];
  
  const hasExpectedChannels = expectedChannels.every(expected => 
    channels.some(ch => ch.topic.includes(expected))
  );
  
  if (hasExpectedChannels) {
    console.log('✅ All expected realtime channels are active');
  } else {
    console.warn('⚠️ Some expected channels missing. Expected:', expectedChannels);
    console.log('📡 Actual channels:', channels.map(ch => ch.topic));
  }
  
  return hasExpectedChannels;
}

export async function fullRealtimeTest(floqId: string) {
  console.log('🎯 Starting full PR-2 realtime test...');
  console.log('👀 Watch the UI for live updates while this runs');
  
  // Test channels first
  await testSubscriptionChannels(floqId);
  
  // Test participants
  await testRealtimeParticipants(floqId);
  
  // Wait a moment for UI to update
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test feed
  await testRealtimeFeed(floqId);
  
  console.log('🎉 PR-2 realtime test complete!');
  console.log('✅ Expected behavior:');
  console.log('  - Your avatar should appear in participants list');
  console.log('  - New feed messages should appear without refresh');
  console.log('  - All updates should be instant');
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testRealtimePR2 = {
    testRealtimeParticipants,
    testRealtimeFeed,
    testSubscriptionChannels,
    fullRealtimeTest
  };
}