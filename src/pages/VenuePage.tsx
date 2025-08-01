import { useParams } from "react-router-dom";
import { useVenueDetails } from "@/hooks/useVenueDetails";
import { useVenueInteractions } from "@/hooks/useVenueInteractions";
import { Loader2, MapPin, Users, Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function VenuePage() {
  const { id } = useParams<{ id: string }>();
  
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
  const { trackInteraction, isLoading: isTrackingInteraction } = useVenueInteractions();

  const handleFavorite = async () => {
    if (!venue) return;
    
    try {
      await trackInteraction({
        venue_id: venue.id,
        interaction_type: 'favorite'
      });
      toast.success("Added to favorites!");
    } catch (error) {
      toast.error("Failed to favorite venue");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{venue.name}</h1>
                {venue.vibe && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {venue.vibe}
                  </div>
                )}
              </div>
              <Button 
                onClick={handleFavorite}
                disabled={isTrackingInteraction}
                size="lg"
                className="ml-4"
              >
                <Heart className="h-4 w-4 mr-2" />
                {isTrackingInteraction ? "Adding..." : "Favorite"}
              </Button>
            </div>
            
            {venue.description && (
              <p className="text-muted-foreground text-lg">{venue.description}</p>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
              <div className="text-muted-foreground">
                <p>Latitude: {venue.lat}</p>
                <p>Longitude: {venue.lng}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}