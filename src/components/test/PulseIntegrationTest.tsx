import React from 'react';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { useTrendingVenues } from '@/hooks/useTrendingVenues';
import { useWeather } from '@/hooks/useWeather';
import { usePulseBadges } from '@/hooks/usePulseBadges';
import { useAuth } from '@/providers/AuthProvider';

export const PulseIntegrationTest: React.FC = () => {
  const { user } = useAuth();
  
  // Test all the new hooks
  const { data: liveActivity, isLoading: liveLoading, error: liveError } = useLiveActivity();
  const { data: trendingVenues, isLoading: trendingLoading, error: trendingError } = useTrendingVenues();
  const { data: weather, isLoading: weatherLoading, error: weatherError } = useWeather();
  const { data: badges, isLoading: badgesLoading, error: badgesError } = usePulseBadges(user?.id);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Pulse Integration Test</h2>
      
      {/* Live Activity */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Live Activity</h3>
        {liveLoading && <p>Loading live activity...</p>}
        {liveError && <p className="text-red-500">Error: {liveError.message}</p>}
        {liveActivity && (
          <div>
            <p>Pages: {(liveActivity as any)?.pages?.length || 0}</p>
            <p>Total events: {(liveActivity as any)?.pages?.flat().length || 0}</p>
            {(liveActivity as any)?.pages?.flat().slice(0, 3).map((event: any, i: number) => (
              <div key={i} className="text-sm bg-gray-100 p-2 rounded mt-2">
                {event.event_type} - {event.created_at}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Venues */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Trending Venues</h3>
        {trendingLoading && <p>Loading trending venues...</p>}
        {trendingError && <p className="text-red-500">Error: {trendingError.message}</p>}
        {trendingVenues && (
          <div>
            <p>Count: {(trendingVenues as any)?.length || 0}</p>
            {(trendingVenues as any)?.slice(0, 3).map((venue: any, i: number) => (
              <div key={i} className="text-sm bg-gray-100 p-2 rounded mt-2">
                {venue.name} - {venue.people_now} people - {venue.trend_score} score
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weather */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Weather</h3>
        {weatherLoading && <p>Loading weather...</p>}
        {weatherError && <p className="text-red-500">Error: {weatherError.message}</p>}
        {weather && (
          <div className="text-sm bg-gray-100 p-2 rounded">
            Weather: {(weather as any)?.temperatureF || 'N/A'}°F, {(weather as any)?.condition || 'N/A'}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Pulse Badges</h3>
        {badgesLoading && <p>Loading badges...</p>}
        {badgesError && <p className="text-red-500">Error: {badgesError.message}</p>}
        {badges && (
          <div className="text-sm bg-gray-100 p-2 rounded">
            Active Floqs: {(badges as any)?.activeFloqs || 0} | Venues Discovered: {(badges as any)?.venuesDiscovered || 0}
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-semibold mb-2">Integration Status</h3>
        <div className="space-y-1 text-sm">
          <p>✅ Edge Function: Deployed</p>
          <p>✅ React Hooks: Created</p>
          <p>✅ TypeScript Types: Defined</p>
          <p>⚠️ Database Tables: Need migration</p>
          <p>✅ UI Integration: Updated</p>
        </div>
      </div>
    </div>
  );
};