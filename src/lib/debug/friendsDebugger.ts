/**
 * Friends Layer Debug Utilities
 * Helps test and visualize the friends system on the map
 */

if (import.meta.env.DEV && typeof window !== 'undefined') {
  
  // Add mock friends for testing
  (window as any).addMockFriends = () => {
    const mockFriends = [
      { id: 'friend-1', lng: -122.4094, lat: 37.7849, isFriend: true, vibe: 'social' },
      { id: 'friend-2', lng: -122.4294, lat: 37.7649, isFriend: true, vibe: 'chill' },
      { id: 'friend-3', lng: -122.4394, lat: 37.7949, isFriend: true, vibe: 'hype' },
      { id: 'friend-4', lng: -122.4194, lat: 37.7749, isFriend: true, vibe: 'curious' }
    ];
    
    // Store in sessionStorage so they persist during dev
    sessionStorage.setItem('mock-friends', JSON.stringify(mockFriends));
    console.log('🫂 Mock friends added:', mockFriends);
    console.log('Refresh the page to see them on the map!');
    
    return mockFriends;
  };
  
  // Clear mock friends
  (window as any).clearMockFriends = () => {
    sessionStorage.removeItem('mock-friends');
    console.log('🧹 Mock friends cleared. Refresh to update map.');
  };
  
  // Debug friends layer
  (window as any).debugFriendsLayer = () => {
    const map = (window as any).__FLOQ_MAP;
    if (!map) {
      console.error('❌ No map instance found');
      return;
    }
    
    console.group('🫂 Friends Layer Debug');
    
    // Check layer exists
    const layer = map.getLayer('friends-pins');
    console.log('Friends layer exists:', !!layer);
    
    // Check source data
    const source = map.getSource('people');
    if (source && (source as any)._data) {
      const peopleData = (source as any)._data;
      const friends = peopleData.features?.filter((f: any) => f.properties.friend) || [];
      console.log('Friends in source:', friends.length);
      console.table(friends.map((f: any) => ({
        id: f.properties.id,
        vibe: f.properties.vibe,
        friend: f.properties.friend,
        coords: f.geometry.coordinates
      })));
    }
    
    // Check layer visibility
    if (layer) {
      const visibility = map.getLayoutProperty('friends-pins', 'visibility');
      console.log('Layer visibility:', visibility || 'visible');
      
      const paint = map.getPaintProperty('friends-pins', 'circle-color');
      console.log('Layer paint properties loaded:', !!paint);
    }
    
    console.groupEnd();
  };
  
  // Get mock friends from storage (for integration with the main app)
  (window as any).getMockFriends = () => {
    const stored = sessionStorage.getItem('mock-friends');
    return stored ? JSON.parse(stored) : [];
  };
  
  // Auto-load debug tools
  setTimeout(() => {
    console.log('🫂 Friends debugger loaded!');
    console.log('• addMockFriends() - Add test friends to the map');
    console.log('• clearMockFriends() - Remove test friends');
    console.log('• debugFriendsLayer() - Check friends layer status');
  }, 2000);
}