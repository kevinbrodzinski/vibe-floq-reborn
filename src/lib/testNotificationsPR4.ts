// PR-4 Notifications & Auto-Discovery Testing Script
// Test in-app notifications and auto-discovery for momentary floqs

import { supabase } from '@/integrations/supabase/client';

export async function testMomentaryFloqNotifications() {
  console.log('🔔 Testing momentary floq notifications...');
  
  try {
    // Get current user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.error('❌ No authenticated user');
      return false;
    }

    // Test 1: Create a test notification manually
    console.log('📍 Step 1: Creating test notification...');
    
    const { error: notifError } = await supabase
      .from('event_notifications')
      .insert({
        profile_id: user.user.id,
        kind: 'friend_started_floq_nearby',
        payload: {
          friend_id: 'test-friend-id',
          friend_name: 'Test Friend',
          floq_id: 'test-floq-id',
          floq_title: 'Test Momentary Floq',
          venue_name: 'Test Venue',
          lat: 34.0522,
          lng: -118.2437,
        }
      });

    if (notifError) {
      console.error('❌ Failed to create test notification:', notifError);
      return false;
    }

    console.log('✅ Test notification created');

    // Test 2: Check if notification appears in unseen list
    const { data: notifications } = await supabase
      .from('event_notifications')
      .select('*')
      .eq('profile_id', user.user.id)
      .eq('kind', 'friend_started_floq_nearby')
      .is('seen_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (notifications && notifications.length > 0) {
      console.log('✅ Notification appears in unseen list:', notifications[0]);
    } else {
      console.warn('⚠️ Notification not found in unseen list');
    }

    return true;
  } catch (error) {
    console.error('❌ Exception testing notifications:', error);
    return false;
  }
}

export async function testAutoDiscoverySystem() {
  console.log('🔍 Testing auto-discovery system...');
  
  try {
    // Test wave discovery query
    const { data: waves } = await supabase.rpc('rpc_waves_near', {
      center_lat: 34.0522,
      center_lng: -118.2437,
      radius_m: 2000,
      friends_only: true,
      min_size: 3,
      recent_minutes: 5,
      only_close_friends: false
    });

    console.log(`✅ Auto-discovery found ${waves?.length ?? 0} friend waves`);

    // Test recent momentary floqs by friends
    const { data: user } = await supabase.auth.getUser();
    const { data: friends } = await supabase.rpc('fn_friend_ids', {
      viewer: user.user?.id,
      only_close: false
    });

    if (friends && friends.length > 0) {
      const { data: recentFloqs } = await supabase
        .from('floqs')
        .select(`
          id, title, name, creator_id, created_at, ends_at, flock_type,
          creator:profiles!creator_id(display_name, username)
        `)
        .eq('flock_type', 'momentary')
        .in('creator_id', friends)
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
        .order('created_at', { ascending: false })
        .limit(5);

      console.log(`✅ Found ${recentFloqs?.length ?? 0} recent friend momentary floqs`);
      
      if (recentFloqs && recentFloqs.length > 0) {
        console.log('📱 Recent friend floqs:', recentFloqs.map(f => ({
          id: f.id,
          title: f.title || f.name,
          creator: (f.creator as any)?.display_name || 'Unknown'
        })));
      }
    }

    return {
      waves: waves?.length ?? 0,
      friendFloqs: 0, // Will be filled by actual query
      friends: friends?.length ?? 0
    };
  } catch (error) {
    console.error('❌ Exception testing auto-discovery:', error);
    return false;
  }
}

export async function testNotificationFlow() {
  console.log('🎯 Testing complete notification flow...');
  
  // Test 1: Notification creation and display
  const notifTest = await testMomentaryFloqNotifications();
  if (!notifTest) return false;

  // Test 2: Auto-discovery system
  const discoveryTest = await testAutoDiscoverySystem();
  if (!discoveryTest) return false;

  console.log('🎉 Notification flow test complete!');
  console.log('✅ Expected behavior:');
  console.log('  1. Friends get notified when you create momentary floqs');
  console.log('  2. You get notified when friends join your floqs');
  console.log('  3. Auto-discovery runs every 30 seconds in background');
  console.log('  4. Notifications appear in avatar dropdown → notifications');
  console.log('  5. Tapping notifications navigates to relevant floq/discover page');
  
  return {
    notifications: notifTest,
    autoDiscovery: discoveryTest
  };
}

export async function simulateNotificationScenarios() {
  console.log('🎭 Simulating realistic notification scenarios...');
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;

  const scenarios = [
    {
      kind: 'friend_started_floq_nearby',
      payload: {
        friend_name: 'Alex',
        floq_title: 'Coffee Run at Blue Bottle',
        venue_name: 'Blue Bottle Coffee',
        lat: 34.0522,
        lng: -118.2437,
      },
      description: 'Friend started a floq at a nearby venue'
    },
    {
      kind: 'wave_activity_friend',
      payload: {
        size: 5,
        friends_count: 2,
        venue_name: 'The Rooftop Bar',
        lat: 34.0530,
        lng: -118.2440,
      },
      description: 'Friends are gathering in a wave'
    },
    {
      kind: 'momentary_floq_nearby',
      payload: {
        floq_title: 'Spontaneous Dinner',
        venue_name: 'Bestia',
        distance_m: 150,
        lat: 34.0515,
        lng: -118.2435,
      },
      description: 'Momentary floq happening nearby'
    }
  ];

  try {
    for (const scenario of scenarios) {
      const { error } = await supabase
        .from('event_notifications')
        .insert({
          profile_id: user.user.id,
          kind: scenario.kind,
          payload: scenario.payload
        });

      if (error) {
        console.error(`❌ Failed to create ${scenario.kind} notification:`, error);
      } else {
        console.log(`✅ Created ${scenario.description} notification`);
      }
    }

    console.log('🎉 Notification scenarios created!');
    console.log('👀 Check your notifications (avatar dropdown → bell icon)');
    
    return true;
  } catch (error) {
    console.error('❌ Exception creating notification scenarios:', error);
    return false;
  }
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testNotificationsPR4 = {
    testMomentaryFloqNotifications,
    testAutoDiscoverySystem,
    testNotificationFlow,
    simulateNotificationScenarios
  };
}