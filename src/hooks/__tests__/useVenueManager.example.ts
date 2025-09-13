import { useVenueManager } from '@/hooks/useVenueManager';

/**
 * Example usage of the new VenueManager system
 * This demonstrates the bulletproof venue operations available
 */

// Example 1: Basic venue operations
function VenueCard({ venueId }: { venueId: string }) {
  const vm = useVenueManager({ venueId, autoFetchDetails: true });

  const handleStartFlow = async () => {
    const result = await vm.flow.start({ visibility: 'public' });
    if (result.success) {
      console.log('✅ Flow started successfully');
    }
  };

  const handleJoinVenue = async () => {
    const result = await vm.venue.join();
    if (result.success) {
      console.log('✅ Joined venue successfully');
    }
  };

  const handleQuickActions = () => {
    vm.venue.checkIn();     // Immediate check-in
    vm.venue.save();        // Save/share venue
    vm.venue.favorite();    // Add to favorites
  };

  return {
    venue: vm.venue,
    isLoading: vm.isLoadingVenue,
    actions: {
      startFlow: handleStartFlow,
      join: handleJoinVenue,
      quickActions: handleQuickActions,
    }
  };
}

// Example 2: Batch operations for complex workflows
function FlowStarter({ venueId }: { venueId: string }) {
  const vm = useVenueManager({ venueId });

  const handleStartFlowAndJoin = async () => {
    // This does: start flow → join venue → record venue as first segment
    const result = await vm.batch.joinAndStartFlow();
    if (result.success) {
      console.log('✅ Flow started and venue joined in one operation');
    }
  };

  const handleCheckInAndSave = () => {
    // This does: check-in + save in parallel
    vm.batch.checkInAndSave();
    console.log('✅ Checked in and saved venue');
  };

  return {
    flowState: vm.flowState,
    sunExposure: vm.sunExposure,
    actions: {
      startFlowAndJoin: handleStartFlowAndJoin,
      checkInAndSave: handleCheckInAndSave,
    }
  };
}

// Example 3: Advanced usage with raw hooks
function AdvancedVenueControls({ venueId }: { venueId: string }) {
  const vm = useVenueManager({ venueId });
  
  // Access raw hooks for custom logic
  const { venueJoin, flowRecorder } = vm.hooks;

  const handleCustomFlow = async () => {
    // Custom flow logic with manual control
    await flowRecorder.start({ visibility: 'friends' });
    
    // Record custom segments
    await vm.flow.append({
      center: vm.coordinates ? { 
        lng: vm.coordinates.lng, 
        lat: vm.coordinates.lat 
      } : undefined,
      venue_id: venueId,
      exposure_fraction: 0.8, // High outdoor exposure
      vibe_vector: { energy: 0.7, valence: 0.9 }
    });
    
    console.log(`✅ Custom flow segment recorded. SUI: ${vm.sunExposure.sui01.toFixed(2)}`);
  };

  return {
    hasLocation: vm.hasLocation,
    coordinates: vm.coordinates,
    flowSegments: vm.flowSegments,
    actions: {
      customFlow: handleCustomFlow,
    }
  };
}

// Example 4: Event Bridge integration test
function EventBridgeTest() {
  const vm = useVenueManager();
  
  // Test the event bridge by directly calling operations
  const testEventBridge = async (venueId: string) => {
    console.log('🧪 Testing venue manager operations...');
    
    // Test flow start
    const flowResult = await vm.flow.start();
    console.log('Flow start:', flowResult.success ? '✅' : '❌');
    
    // Test venue operations (these will work with any venueId)
    try {
      vm.venue.checkIn(venueId);
      console.log('Check-in: ✅');
      
      vm.venue.save(venueId);
      console.log('Save: ✅');
      
      vm.venue.plan(venueId);
      console.log('Plan: ✅');
      
      vm.venue.favorite(venueId);
      console.log('Favorite: ✅');
      
    } catch (error) {
      console.log('Venue operations error:', error);
    }
    
    console.log('🎯 All operations tested');
  };

  return { testEventBridge };
}

export {
  VenueCard,
  FlowStarter, 
  AdvancedVenueControls,
  EventBridgeTest
};