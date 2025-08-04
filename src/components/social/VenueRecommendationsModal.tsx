import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VenueRecommendationCard } from './VenueRecommendationCard';
import { useVenueRecommendations } from '@/hooks/useVenueRecommendations';

interface VenueRecommendationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VenueRecommendationsModal: React.FC<VenueRecommendationsModalProps> = ({
  open,
  onOpenChange
}) => {
  const { data, trackRecommendationClick } = useVenueRecommendations();
  
  const handleVisit = (venueId: string) => {
    console.log(`Getting directions to venue: ${venueId}`);
    // TODO: Open maps with directions
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="text-center pb-4">
          <SheetTitle className="text-xl">Venues That Match Your Vibe</SheetTitle>
          <SheetDescription>
            AI-powered recommendations based on your current energy, social patterns, and friend network
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 -mx-3 sm:-mx-6">
          <div className="px-3 sm:px-6 space-y-4 sm:space-y-6 pb-6">
            {data.map((venue) => (
              <VenueRecommendationCard
                key={venue.id}
                venue={venue}
                onVisit={handleVisit}
                onTrackClick={trackRecommendationClick}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};