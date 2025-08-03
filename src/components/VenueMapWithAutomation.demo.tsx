import React, { useEffect, useState, useCallback } from 'react';
import { useClusterVenuesMock } from '@/hooks/useClusterVenues.mock';
import { useAutomatedVenueSyncMock, useVenueSyncStatsMock } from '@/hooks/useAutomatedVenueSync.mock';

interface VenueMapProps {
  // Map bounds: [west, south, east, north]
  bounds: [number, number, number, number] | null;
  // Current map center
  center: { lat: number; lng: number } | null;
  // Whether to show sync status
  showSyncStatus?: boolean;
  // Whether to enable background sync
  enableBackgroundSync?: boolean;
}

interface SyncStatusProps {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: any;
  onManualSync: () => void;
  syncStats: any;
}

const SyncStatus: React.FC<SyncStatusProps> = ({
  isLoading,
  isSyncing,
  lastSyncTime,
  error,
  onManualSync,
  syncStats
}) => {
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Venue Sync</h3>
        <button
          onClick={onManualSync}
          disabled={isSyncing}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${
            isSyncing ? 'text-blue-600' : 
            error ? 'text-red-600' : 
            'text-green-600'
          }`}>
            {isSyncing ? 'Syncing' : error ? 'Error' : 'Ready'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Last sync:</span>
          <span className="text-gray-900">{formatLastSync(lastSyncTime)}</span>
        </div>
        
        {syncStats.data && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">Success rate:</span>
              <span className="text-gray-900">{syncStats.data.successRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total venues:</span>
              <span className="text-gray-900">{syncStats.data.totalVenues}</span>
            </div>
          </>
        )}
        
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {error.message || 'Sync failed'}
          </div>
        )}
        
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs">
          🎭 Demo Mode: Using mock data
        </div>
      </div>
    </div>
  );
};

export const VenueMapWithAutomationDemo: React.FC<VenueMapProps> = ({
  bounds,
  center,
  showSyncStatus = true,
  enableBackgroundSync = true
}) => {
  // Get venues for current bounds (using mock data)
  const {
    data: venues,
    isLoading: venuesLoading,
    error: venuesError,
    refetch: refetchVenues
  } = useClusterVenuesMock(bounds);

  // Automated venue sync (using mock data)
  const {
    isLoading: syncLoading,
    isSyncing,
    error: syncError,
    triggerSync,
    lastSyncTime
  } = useAutomatedVenueSyncMock(
    center?.lat || null,
    center?.lng || null,
    {
      enabled: true,
      backgroundSync: enableBackgroundSync,
      sources: ['google', 'foursquare']
    }
  );

  // Sync statistics (using mock data)
  const syncStats = useVenueSyncStatsMock();

  // Manual sync handler
  const handleManualSync = useCallback(async () => {
    if (!center) return;
    
    try {
      await triggerSync(center.lat, center.lng, {
        forceRefresh: true
      });
      
      // Refresh venues after sync
      setTimeout(() => {
        refetchVenues();
      }, 1000);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }, [center, triggerSync, refetchVenues]);

  // Render venue markers
  const renderVenueMarkers = () => {
    if (!venues || venues.length === 0) return null;

    return venues.map((venue) => (
      <div
        key={venue.id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
        style={{
          left: `${((venue.lng - (bounds?.[0] || 0)) / ((bounds?.[2] || 0) - (bounds?.[0] || 0))) * 100}%`,
          top: `${(1 - ((venue.lat - (bounds?.[1] || 0)) / ((bounds?.[3] || 0) - (bounds?.[1] || 0)))) * 100}%`
        }}
        onClick={() => console.log('Venue clicked:', venue)}
      >
        <div className={`
          w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all hover:scale-110
          ${venue.live_count > 0 ? 'bg-green-500' : 'bg-blue-500'}
          ${venue.live_count > 5 ? 'animate-pulse' : ''}
        `}>
          {venue.live_count > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {venue.live_count}
            </div>
          )}
        </div>
        
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 shadow-lg text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="font-medium text-gray-900">{venue.name}</div>
          <div className="text-gray-500">{venue.category}</div>
          {venue.live_count > 0 && (
            <div className="text-green-600 font-medium">{venue.live_count} people here</div>
          )}
          <div className="text-gray-400">Score: {venue.vibe_score}</div>
        </div>
      </div>
    ));
  };

  if (!bounds || !center) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-gray-500">Map bounds not available</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg overflow-hidden">
      {/* Map placeholder with city indication */}
      <div className="w-full h-full flex items-center justify-center text-gray-700 relative">
        <div className="text-center z-0">
          <div className="text-4xl mb-2">🗺️</div>
          <div className="text-lg font-medium">Interactive Venue Map</div>
          <div className="text-sm">
            Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </div>
          <div className="text-sm font-medium text-blue-600">
            {venues?.length || 0} venues loaded
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Click city buttons above to explore different areas
          </div>
        </div>

        {/* City name overlay */}
        <div className="absolute top-4 left-4 bg-white/90 rounded-lg px-3 py-2 shadow-sm">
          <div className="text-sm font-medium text-gray-900">
            {center.lat > 40 && center.lat < 41 ? '🗽 New York City' :
             center.lat > 33 && center.lat < 35 ? '🌴 Los Angeles' :
             '🌉 San Francisco'}
          </div>
        </div>
      </div>

      {/* Venue markers overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full pointer-events-auto">
          {renderVenueMarkers()}
        </div>
      </div>

      {/* Loading overlay */}
      {(venuesLoading || syncLoading) && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm">
                {syncLoading ? 'Syncing venues...' : 'Loading venues...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync status panel */}
      {showSyncStatus && (
        <SyncStatus
          isLoading={syncLoading}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          error={syncError}
          onManualSync={handleManualSync}
          syncStats={syncStats}
        />
      )}

      {/* Error message */}
      {venuesError && (
        <div className="absolute bottom-4 left-4 bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm z-10">
          <div className="text-red-800 font-medium text-sm">Failed to load venues</div>
          <div className="text-red-600 text-xs mt-1">
            {venuesError.message}
          </div>
        </div>
      )}

      {/* Demo indicator */}
      <div className="absolute bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 z-10">
        🎭 Demo Mode - Mock Data
      </div>
    </div>
  );
};

// Example usage component with demo data
export const VenueMapExampleDemo: React.FC = () => {
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // San Francisco
  const [mapBounds, setMapBounds] = useState<[number, number, number, number]>([
    -122.5194, 37.7249, -122.3694, 37.8249
  ]);

  // Simulate map movement
  const moveMap = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    const offset = 0.05;
    setMapBounds([lng - offset, lat - offset, lng + offset, lat + offset]);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold">🤖 Automated Venue System Demo</h1>
        <div className="flex space-x-2 mt-2">
          <button
            onClick={() => moveMap(37.7749, -122.4194)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            🌉 San Francisco
          </button>
          <button
            onClick={() => moveMap(40.7128, -74.0060)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            🗽 New York
          </button>
          <button
            onClick={() => moveMap(34.0522, -118.2437)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            🌴 Los Angeles
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Click different cities to see venues change automatically. This demo uses mock data to show the UI without requiring backend setup.
        </p>
      </div>
      
      <div className="flex-1">
        <VenueMapWithAutomationDemo
          bounds={mapBounds}
          center={mapCenter}
          showSyncStatus={true}
          enableBackgroundSync={true}
        />
      </div>
    </div>
  );
};