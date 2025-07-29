import React from 'react';
import { useTrendingVenues } from '@/hooks/useTrendingVenues';

export const TrendingVenuesTest: React.FC = () => {
  // Test with LA coordinates
  const { data: venues = [], isLoading, error } = useTrendingVenues();

  if (isLoading) return <div>Loading trending venues...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Trending Venues Test</h2>
      <div className="space-y-2">
        {venues.length === 0 ? (
          <p className="text-gray-500">No trending venues found (expected - no visit data yet)</p>
        ) : (
          venues.map((venue) => (
            <div key={venue.venue_id} className="border p-3 rounded">
              <h3 className="font-semibold">{venue.name}</h3>
              <p className="text-sm text-gray-600">
                {venue.distance_m}m away • {venue.people_now} people now • 
                Trend score: {venue.trend_score}
              </p>
              <p className="text-xs text-gray-500">
                Last seen: {new Date(venue.last_seen_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 