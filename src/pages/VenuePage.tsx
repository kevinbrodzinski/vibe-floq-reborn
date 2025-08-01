import React from "react";
import { useParams } from "react-router-dom";
import { useVenueDetails } from "@/hooks/useVenueDetails";
import { useVenueInteractions } from "@/hooks/useVenueInteractions";
import { useVenueInteractionTest } from "@/hooks/useVenueInteractionTest";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Users, Star, Heart, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function VenuePage() {
  const { id } = useParams() as { id?: string };
  const queryClient = useQueryClient();
  
  // Validate the venue ID format
  if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invalid Venue ID</h3>
              <p className="text-muted-foreground mb-4">
                The venue ID provided is not valid.
              </p>
              <Button onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: venue, isLoading, error } = useVenueDetails(id);
  const { trackInteraction, checkIn, favorite, view, isLoading: isTrackingInteraction } = useVenueInteractions();
  const { data: testData } = useVenueInteractionTest(id);

  const handleFavorite = async () => {
    if (!venue || !id) return;
    
    console.log(`❤️ Favoriting venue: ${venue.name} (${id})`);
    
    // Optimistic update
    queryClient.setQueryData(['venue-details', id], (old: any) => ({
      ...old,
      is_favorite: true
    }));
    
    try {
      await trackInteraction({
        venue_id: venue.id,
        interaction_type: 'favorite'
      });
      toast.success("Added to favorites!");
    } catch (error) {
      console.error('Failed to favorite venue:', error);
      // Rollback on error
      queryClient.setQueryData(['venue-details', id], (old: any) => ({
        ...old,
        is_favorite: false
      }));
      toast.error("Failed to favorite venue");
    }
  };

  const handleCheckIn = async () => {
    if (!venue || !id) return;
    
    console.log(`📍 Checking in to venue: ${venue.name} (${id})`);
    
    try {
      await checkIn(venue.id);
      toast.success("Checked in successfully!");
    } catch (error) {
      console.error('Failed to check in:', error);
      toast.error("Failed to check in");
    }
  };

  const handleView = async () => {
    if (!venue || !id) return;
    
    console.log(`👁️ Recording view for venue: ${venue.name} (${id})`);
    
    try {
      await view(venue.id);
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  };

  // Record view when venue loads
  React.useEffect(() => {
    if (venue && !isLoading) {
      handleView();
    }
  }, [venue, isLoading]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <div className="text-center text-muted-foreground">Loading venue details...</div>
        </div>
      </main>
    );
  }

  if (error || !venue) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Venue Not Found</h3>
              <p className="text-muted-foreground mb-4">
                Sorry, we couldn't find the venue you're looking for.
              </p>
              <Button onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold truncate">{venue.name}</h1>
              {venue.vibe && (
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mt-1">
                  {venue.vibe}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleFavorite}
                disabled={isTrackingInteraction}
                size="sm"
                className="flex-1"
              >
                <Heart className="h-4 w-4 mr-2" />
                {isTrackingInteraction ? "Adding..." : `Favorite${testData?.favoriteCount ? ` (${testData.favoriteCount})` : ''}`}
              </Button>
              <Button 
                onClick={handleCheckIn}
                disabled={isTrackingInteraction}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isTrackingInteraction ? "Checking..." : `Check In${testData?.checkInCount ? ` (${testData.checkInCount})` : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">{/* Header */}
          {/* Description */}
          {venue.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-lg">{venue.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Count</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{venue.live_count}</div>
                <p className="text-xs text-muted-foreground">
                  People currently here
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vibe Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{venue.vibe_score}/100</div>
                <p className="text-xs text-muted-foreground">
                  Energy level
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Popularity</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{venue.popularity}</div>
                <p className="text-xs text-muted-foreground">
                  Venue rating
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground space-y-1">
                <p>Latitude: {venue.lat}</p>
                <p>Longitude: {venue.lng}</p>
              </div>
            </CardContent>
          </Card>

          {/* Debug Info - Show interaction data in development */}
          {process.env.NODE_ENV === 'development' && testData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TestTube className="h-5 w-5 mr-2" />
                  Debug: Interaction Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div>Views: {testData.viewCount}</div>
                  <div>Favorites: {testData.favoriteCount}</div>
                  <div>Check-ins: {testData.checkInCount}</div>
                  <div>Shares: {testData.shareCount}</div>
                  <div>Currently Present: {testData.isCurrentlyPresent ? 'Yes' : 'No'}</div>
                  <div>Total Interactions: {testData.interactions.length}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}