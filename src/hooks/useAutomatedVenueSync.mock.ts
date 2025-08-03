import { useState, useEffect } from 'react';

// Mock data for testing
const mockVenues = [
  {
    id: '1',
    name: 'Blue Bottle Coffee',
    category: 'cafe',
    lat: 37.7749,
    lng: -122.4194,
    vibe_score: 85,
    live_count: 3,
    popularity: 75
  },
  {
    id: '2', 
    name: 'The Fillmore',
    category: 'music venue',
    lat: 37.7849,
    lng: -122.4294,
    vibe_score: 92,
    live_count: 0,
    popularity: 88
  },
  {
    id: '3',
    name: 'Mission Dolores Park',
    category: 'park',
    lat: 37.7599,
    lng: -122.4269,
    vibe_score: 78,
    live_count: 12,
    popularity: 95
  }
];

const mockSyncStats = {
  totalSyncs: 45,
  lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
  successRate: 94.2,
  averageVenues: 23,
  totalVenues: 1247
};

export function useAutomatedVenueSyncMock(
  lat: number | null,
  lng: number | null,
  options: any = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(mockSyncStats.lastSync);
  const [error, setError] = useState<any>(null);

  const triggerSync = async (targetLat?: number, targetLng?: number, syncOptions: any = {}) => {
    setIsSyncing(true);
    setError(null);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLastSyncTime(new Date());
    setIsSyncing(false);
    
    return {
      ok: true,
      total_venues: Math.floor(Math.random() * 30) + 10,
      new_venues: Math.floor(Math.random() * 10),
      updated_venues: Math.floor(Math.random() * 5),
      deduplicated: Math.floor(Math.random() * 3),
      sources_used: ['google', 'foursquare'],
      sync_time_ms: 1800 + Math.random() * 400
    };
  };

  const needsSync = (checkLat: number, checkLng: number): boolean => {
    return Math.random() > 0.7; // 30% chance needs sync
  };

  const getSyncStatus = () => ({
    isLoading,
    lastSync: lastSyncTime,
    result: {
      ok: true,
      total_venues: 23,
      new_venues: 5,
      updated_venues: 2,
      deduplicated: 1
    },
    error: error?.message
  });

  return {
    isLoading,
    isSyncing,
    error,
    data: null,
    triggerSync,
    needsSync,
    getSyncStatus,
    lastSyncTime,
    syncCount: 1,
    isEnabled: true,
    sources: ['google', 'foursquare'],
    syncRadius: 1500
  };
}

export function useVenueSyncStatsMock() {
  return {
    data: mockSyncStats,
    isLoading: false,
    error: null
  };
}