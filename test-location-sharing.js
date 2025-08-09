// ====================================================================
// FLOQ LOCATION SHARING TEST SCRIPT
// Copy and paste this into your browser console to test location sharing
// ====================================================================

console.log('🧪 Starting Floq Location Sharing Tests...');

// Test 1: Check if location sharing system is loaded
function testSystemLoaded() {
  console.group('1️⃣ Testing System Components');
  
  // Check if Supabase is available
  if (typeof supabase !== 'undefined') {
    console.log('✅ Supabase client loaded');
  } else {
    console.error('❌ Supabase client not found');
  }
  
  // Check if location hooks are available
  const hasGeo = 'geolocation' in navigator;
  console.log(hasGeo ? '✅ Geolocation API available' : '❌ Geolocation API missing');
  
  // Check debug helpers
  if (window.floqDebug) {
    console.log('✅ Debug helpers available');
    window.floqDebug.debugLocationInfo();
  } else {
    console.log('⚠️ Debug helpers not available');
  }
  
  console.groupEnd();
}

// Test 2: Test location sharing configuration
async function testLocationConfig() {
  console.group('2️⃣ Testing Location Configuration');
  
  try {
    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user - please sign in first');
      return;
    }
    console.log('✅ User authenticated:', user.id);
    
    // Check live settings
    const { data: settings } = await supabase
      .from('profiles')
      .select('live_scope, live_auto_when, live_accuracy')
      .eq('id', user.id)
      .single();
      
    console.log('📋 Current live settings:', settings);
    
    // Check sharing preferences
    const { data: sharePrefs } = await supabase
      .from('friend_share_pref')
      .select('*')
      .eq('profile_id', user.id);
      
    console.log('👥 Current sharing preferences:', sharePrefs);
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
  }
  
  console.groupEnd();
}

// Test 3: Test adding a friend for sharing
async function testAddFriend() {
  console.group('3️⃣ Testing Friend Sharing Setup');
  
  try {
    const testFriendId = 'test-friend-' + Date.now();
    console.log('🧪 Adding test friend:', testFriendId);
    
    // Use the RPC function to add sharing preference
    const { error } = await supabase.rpc('set_live_share_bulk', {
      _friend_ids: [testFriendId],
      _on: true,
      _auto_when: ['always']
    });
    
    if (error) {
      console.error('❌ Failed to add test friend:', error);
    } else {
      console.log('✅ Test friend added successfully');
      
      // Verify it was added
      const { data: verification } = await supabase
        .from('friend_share_pref')
        .select('*')
        .eq('other_profile_id', testFriendId);
        
      console.log('📋 Verification:', verification);
    }
    
  } catch (error) {
    console.error('❌ Friend test failed:', error);
  }
  
  console.groupEnd();
}

// Test 4: Test location broadcasting simulation
function testLocationBroadcast() {
  console.group('4️⃣ Testing Location Broadcasting');
  
  // Simulate location data
  const mockLocation = {
    lat: 37.7749 + (Math.random() - 0.5) * 0.01, // SF with small random offset
    lng: -122.4194 + (Math.random() - 0.5) * 0.01,
    accuracy: 10,
    ts: Date.now()
  };
  
  console.log('📍 Simulating location broadcast:', mockLocation);
  
  // Check if we can create a channel
  try {
    const { data: { user } } = supabase.auth.getUser();
    if (user) {
      const testChannel = supabase.channel(`presence_${user.id}`);
      console.log('✅ Test channel created');
      
      // Simulate broadcast
      testChannel.send({
        type: 'broadcast',
        event: 'live_pos',
        payload: mockLocation
      });
      
      console.log('📡 Simulated location broadcast sent');
      
      // Clean up
      setTimeout(() => {
        supabase.removeChannel(testChannel);
        console.log('🧹 Test channel cleaned up');
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Broadcast test failed:', error);
  }
  
  console.groupEnd();
}

// Test 5: Enable mock presence data for testing
function enableMockPresence() {
  console.group('5️⃣ Enabling Mock Presence Data');
  
  // Set the environment variable to enable mock data
  localStorage.setItem('VITE_USE_MOCK_PRESENCE', 'true');
  console.log('✅ Mock presence data enabled');
  console.log('🔄 Reload the page to see mock friend locations');
  
  console.groupEnd();
}

// Test 6: Complete system test
async function runCompleteTest() {
  console.log('🚀 Running Complete Location Sharing Test Suite...\n');
  
  testSystemLoaded();
  await testLocationConfig();
  await testAddFriend();
  testLocationBroadcast();
  
  console.log('\n✅ Test suite completed!');
  console.log('💡 Tips:');
  console.log('   - Go to /location-sharing to configure settings');
  console.log('   - Enable location permission when prompted');
  console.log('   - Check browser console for broadcast logs');
  console.log('   - Use enableMockPresence() to see test friend locations');
}

// Make functions available globally
window.locationSharingTests = {
  testSystemLoaded,
  testLocationConfig,
  testAddFriend,
  testLocationBroadcast,
  enableMockPresence,
  runCompleteTest
};

console.log('🧪 Location Sharing Test Suite Loaded!');
console.log('📋 Available commands:');
console.log('   locationSharingTests.runCompleteTest() - Run all tests');
console.log('   locationSharingTests.enableMockPresence() - Enable mock friend data');
console.log('   locationSharingTests.testLocationConfig() - Check your settings');

// Auto-run basic test
runCompleteTest();