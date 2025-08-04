import React from 'react';
import { useVenueRecommendations } from '@/hooks/useVenueRecommendations';
import { VenueRecommendationCard } from './VenueRecommendationCard';

export const VenueRecommendations: React.FC = () => {
const { data, trackRecommendationClick } = useVenueRecommendations();
  
  const handleVisit = (venueId: string) => {
    console.log(`Getting directions to venue: ${venueId}`);
    // TODO: Open maps with directions
  };


  if (!data.length) return null;

  return (
    <div className="px-4 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Venues That Match Your Vibe</h2>
        <p className="text-sm text-muted-foreground">
          AI-powered recommendations based on your current energy, social patterns, and friend network
        </p>
      </div>
      
      {data.map((venue) => (
        <VenueRecommendationCard
          key={venue.id}
          venue={venue}
          onVisit={handleVisit}
          onTrackClick={trackRecommendationClick}
        />
      ))}
    </div>
  );
};