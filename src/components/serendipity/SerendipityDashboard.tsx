import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, MapPin, TrendingUp } from 'lucide-react';
import { ResonanceMatchCard } from './ResonanceMatchCard';
import { useSerendipityEngine } from '@/hooks/useSerendipityEngine';
import { useLocationCore } from '@/hooks/location/useLocationCore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SerendipityDashboard() {
  const { matches, loading, error, lastGenerated, generateMatches } = useSerendipityEngine();
  const { coords } = useLocationCore({ enableHighAccuracy: true });
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  // Auto-generate matches on mount if user has location
  useEffect(() => {
    if (coords && !lastGenerated && matches.length === 0) {
      handleGenerateMatches();
    }
  }, [coords, lastGenerated, matches.length]);

  const handleGenerateMatches = async () => {
    const newMatches = await generateMatches({
      limit: 3,
      currentLat: coords?.lat,
      currentLng: coords?.lng
    });

    if (newMatches?.length > 0) {
      toast({
        title: "✨ New Resonance Matches Found!",
        description: `Discovered ${newMatches.length} potential serendipitous connections`,
      });
    } else if (!error) {
      toast({
        title: "🔍 No Matches Right Now",
        description: "Try visiting more places to build your pattern profile",
        variant: "secondary"
      });
    }
  };

  const handleConnect = async (partnerId: string) => {
    // TODO: Implement connection flow
    toast({
      title: "Connection Sent! 🚀",
      description: "Your resonance match will be notified",
    });
    setSelectedMatch(partnerId);
  };

  const handleSkip = (partnerId: string) => {
    // Remove match from current list
    toast({
      title: "Match Skipped",
      description: "We'll find you better matches",
      variant: "secondary"
    });
  };

  const handleViewProfile = (partnerId: string) => {
    // TODO: Navigate to profile view
    console.log('View profile:', partnerId);
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Serendipity Engine</CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI-powered resonance matching based on your patterns
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleGenerateMatches}
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Analyzing...' : 'Find Matches'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Status Information */}
      {lastGenerated && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>Last generated: {lastGenerated.toLocaleTimeString()}</span>
          </div>
          {coords && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Location-aware matching enabled</span>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <div className="absolute inset-0 animate-ping">
                  <Sparkles className="w-8 h-8 text-primary/30" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-medium">Analyzing Resonance Patterns</h3>
                <p className="text-sm text-muted-foreground">
                  Finding your perfect serendipitous connections...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches Display */}
      {!loading && matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Today's Resonance Matches
              <Badge variant="secondary" className="ml-2">
                {matches.length}
              </Badge>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match, index) => (
              <ResonanceMatchCard
                key={`${match.partnerId}-${index}`}
                match={match}
                onConnect={handleConnect}
                onSkip={handleSkip}
                onViewProfile={handleViewProfile}
                className={cn(
                  "transform transition-all duration-300",
                  selectedMatch === match.partnerId && "scale-105 shadow-xl"
                )}
              />
            ))}
          </div>

          {/* Algorithm Info */}
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>Powered by AI pattern recognition and serendipity algorithms</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Matches are based on spatial resonance, temporal compatibility, 
                  shared interests, and social chemistry analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && matches.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium mb-2">No Matches Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Visit more places and interact with the community to build your pattern profile. 
                  The AI needs more data to find your perfect serendipitous connections.
                </p>
              </div>
              {coords ? (
                <Button onClick={handleGenerateMatches} className="mt-4">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try Finding Matches
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enable location services to get location-aware matches
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SerendipityDashboard;