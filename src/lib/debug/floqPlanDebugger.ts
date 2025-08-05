/**
 * Floq and Plan Layer Debug Utilities
 * Helps test and visualize the new floq/plan rendering system
 */

import type { MapFloq, MapPlan } from '@/types/mapEntities';

if (import.meta.env.DEV && typeof window !== 'undefined') {
  
  // Add mock floqs for testing
  (window as any).addMockFloqs = () => {
    const mockFloqs: MapFloq[] = [
      {
        id: 'floq-1',
        title: 'Coffee & Code',
        description: 'Casual coding session at local cafe',
        lat: 37.7849,
        lng: -122.4094,
        primary_vibe: 'social',
        participant_count: 3,
        creator_id: 'user-1',
        starts_at: new Date().toISOString(),
        type: 'floq'
      },
      {
        id: 'floq-2', 
        title: 'Beach Volleyball',
        description: 'Pickup game at Ocean Beach',
        lat: 37.7649,
        lng: -122.4294,
        primary_vibe: 'hype',
        participant_count: 8,
        creator_id: 'user-2',
        starts_at: new Date().toISOString(),
        type: 'floq'
      },
      {
        id: 'floq-3',
        title: 'Art Gallery Opening',
        description: 'New exhibition in SOMA',
        lat: 37.7949,
        lng: -122.4394,
        primary_vibe: 'curious',
        participant_count: 12,
        creator_id: 'user-3',
        starts_at: new Date().toISOString(),
        type: 'floq'
      }
    ];
    
    sessionStorage.setItem('mock-floqs', JSON.stringify(mockFloqs));
    console.log('🎯 Mock floqs added:', mockFloqs);
    console.log('Refresh the page to see them on the map!');
    
    return mockFloqs;
  };

  // Add mock plans for testing
  (window as any).addMockPlans = () => {
    const mockPlans: MapPlan[] = [
      {
        id: 'plan-1',
        title: 'SF Food Tour',
        description: 'Multi-stop culinary adventure',
        lat: 37.7849,
        lng: -122.4194,
        vibe_tag: 'social',
        vibe_tags: ['social', 'curious'],
        creator_id: 'user-1',
        planned_at: new Date().toISOString(),
        status: 'active',
        stop_count: 4,
        participant_count: 6,
        type: 'plan'
      },
      {
        id: 'plan-2',
        title: 'Night Out Plan',
        description: 'Dinner → Drinks → Dancing',
        lat: 37.7749,
        lng: -122.4094,
        vibe_tag: 'hype',
        vibe_tags: ['hype', 'social'],
        creator_id: 'user-2',
        planned_at: new Date().toISOString(),
        status: 'draft',
        stop_count: 3,
        participant_count: 4,
        type: 'plan'
      },
      {
        id: 'plan-3',
        title: 'Museum Hopping',
        description: 'Art → Science → History',
        lat: 37.7949,
        lng: -122.4294,
        vibe_tag: 'curious',
        vibe_tags: ['curious', 'chill'],
        creator_id: 'user-3',
        planned_at: new Date().toISOString(),
        status: 'completed',
        stop_count: 5,
        participant_count: 2,
        type: 'plan'
      }
    ];
    
    sessionStorage.setItem('mock-plans', JSON.stringify(mockPlans));
    console.log('📋 Mock plans added:', mockPlans);
    console.log('Refresh the page to see them on the map!');
    
    return mockPlans;
  };
  
  // Clear mock data
  (window as any).clearMockFloqsAndPlans = () => {
    sessionStorage.removeItem('mock-floqs');
    sessionStorage.removeItem('mock-plans');
    console.log('🧹 Mock floqs and plans cleared. Refresh to update map.');
  };
  
  // Debug floq and plan layers
  (window as any).debugFloqPlanLayers = () => {
    const map = (window as any).__FLOQ_MAP;
    if (!map) {
      console.error('❌ No map instance found');
      return;
    }
    
    console.group('🎯📋 Floq & Plan Layers Debug');
    
    // Check floq layers
    const floqLayers = ['floq-points', 'floq-clusters', 'floq-cluster-count'];
    const planLayers = ['plan-points', 'plan-clusters', 'plan-cluster-count', 'plan-stop-indicators'];
    
    console.log('Floq Layers:');
    floqLayers.forEach(layerId => {
      const layer = map.getLayer(layerId);
      console.log(`  ${layerId}: ${layer ? '✅' : '❌'}`);
    });
    
    console.log('Plan Layers:');
    planLayers.forEach(layerId => {
      const layer = map.getLayer(layerId);
      console.log(`  ${layerId}: ${layer ? '✅' : '❌'}`);
    });
    
    // Check source data
    const floqSource = map.getSource('floqs');
    const planSource = map.getSource('plans');
    
    console.log('Sources:');
    console.log(`  floqs source: ${floqSource ? '✅' : '❌'}`);
    console.log(`  plans source: ${planSource ? '✅' : '❌'}`);
    
    if (floqSource && (floqSource as any)._data) {
      const floqData = (floqSource as any)._data;
      console.log(`  floqs features: ${floqData.features?.length || 0}`);
    }
    
    if (planSource && (planSource as any)._data) {
      const planData = (planSource as any)._data;
      console.log(`  plans features: ${planData.features?.length || 0}`);
    }
    
    console.groupEnd();
  };
  
  // Get mock data from storage (for integration with the main app)
  (window as any).getMockFloqs = () => {
    const stored = sessionStorage.getItem('mock-floqs');
    return stored ? JSON.parse(stored) : [];
  };
  
  (window as any).getMockPlans = () => {
    const stored = sessionStorage.getItem('mock-plans');
    return stored ? JSON.parse(stored) : [];
  };
  
  // Auto-load debug tools
  setTimeout(() => {
    console.log('🎯📋 Floq & Plan debugger loaded!');
    console.log('• addMockFloqs() - Add test floqs to the map');
    console.log('• addMockPlans() - Add test plans to the map');  
    console.log('• clearMockFloqsAndPlans() - Remove all test data');
    console.log('• debugFloqPlanLayers() - Check layer status');
  }, 2000);
}