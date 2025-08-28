import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MapPin, Users, MessageCircle, UserPlus, Zap } from 'lucide-react';
import { getVibeIcon } from '@/utils/vibeIcons';
import { VIBE_COLORS } from '@/lib/vibes';
import type { Vibe } from '@/lib/vibes';
import { formatDistanceToNow } from 'date-fns';

interface VibeMatch {
  profile_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  current_vibe: Vibe;
  distance_meters: number;
  compatibility_score: number;
  shared_interests: string[];
  last_seen: string;
  mutual_friends_count: number;
}

interface VenueMatch {
  venue_id: string;
  name: string;
  address?: string;
  distance_meters: number;
  vibe_score: number;
  current_vibe_distribution: Record<Vibe, number>;
  total_users: number;
  matching_users: VibeMatch[];
}

interface VibeMatchingServiceProps {
  userVibe: Vibe;
  location?: { lat: number; lng: number };
}

export const VibeMatchingService: React.FC<VibeMatchingServiceProps> = ({
  userVibe,
  location
}) => {
  const currentUserId = useCurrentUserId();
  const [radiusKm, setRadiusKm] = useState(5);

  // Fetch vibe-matched people - placeholder implementation
  const { data: peopleMatches = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['vibe-matches-people', userVibe, location, radiusKm],
    queryFn: async (): Promise<VibeMatch[]> => {
      if (!location) return [];
      // Return mock data for now
      return [] as VibeMatch[];
    },
    enabled: !!location,
  });

  // Fetch vibe-matched venues - placeholder implementation  
  const { data: venueMatches = [], isLoading: venuesLoading } = useQuery({
    queryKey: ['vibe-matches-venues', userVibe, location, radiusKm],
    queryFn: async (): Promise<VenueMatch[]> => {
      if (!location) return [];
      // Return empty array for now
      return [] as VenueMatch[];
    },
    enabled: !!location,
  });

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!location) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Enable location to find vibe matches nearby
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Vibe Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div 
              className="text-2xl p-2 rounded-lg"
              style={{ backgroundColor: `${VIBE_COLORS[userVibe]}20` }}
            >
              {getVibeIcon(userVibe)}
            </div>
            <div>
              <h3>Finding matches for "{userVibe}" vibe</h3>
              <p className="text-sm text-muted-foreground">
                Within {radiusKm}km of your location
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            People ({peopleMatches.length})
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Venues ({venueMatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-4">
          {peopleLoading ? (
            <div className="text-center py-8">Finding people with similar vibes...</div>
          ) : peopleMatches.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No one nearby is currently vibing "{userVibe}"
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try expanding your search radius or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {peopleMatches.map((match) => (
                <Card key={match.profile_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={match.avatar_url || ''} />
                          <AvatarFallback>
                            {match.display_name?.[0] || match.username?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {match.display_name || match.username}
                            </h4>
                            <div className="text-lg">{getVibeIcon(match.current_vibe)}</div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatDistance(match.distance_meters)} away</span>
                            <span>
                              {match.mutual_friends_count} mutual friend{match.mutual_friends_count !== 1 ? 's' : ''}
                            </span>
                            <span>
                              Last seen {formatDistanceToNow(new Date(match.last_seen))} ago
                            </span>
                          </div>
                          
                          {/* Compatibility Score */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Compatibility</span>
                              <span className={getCompatibilityColor(match.compatibility_score)}>
                                {match.compatibility_score}%
                              </span>
                            </div>
                            <Progress value={match.compatibility_score} className="h-1" />
                          </div>
                          
                          {/* Shared Interests */}
                          {match.shared_interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {match.shared_interests.slice(0, 3).map((interest) => (
                                <Badge key={interest} variant="secondary" className="text-xs">
                                  {interest}
                                </Badge>
                              ))}
                              {match.shared_interests.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{match.shared_interests.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline">
                          <UserPlus className="w-4 h-4 mr-1" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="venues" className="space-y-4">
          {venuesLoading ? (
            <div className="text-center py-8">Finding venues that match your vibe...</div>
          ) : venueMatches.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No venues nearby are currently matching the "{userVibe}" vibe
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {venueMatches.map((venue) => (
                <Card key={venue.venue_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{venue.name}</h4>
                          {venue.address && (
                            <p className="text-sm text-muted-foreground">{venue.address}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span>{formatDistance(venue.distance_meters)} away</span>
                            <span>•</span>
                            <span>{venue.total_users} people here</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="font-medium">{venue.vibe_score}% match</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vibe Distribution */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current vibes at this venue:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(venue.current_vibe_distribution)
                            .filter(([_, count]) => count > 0)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([vibe, count]) => (
                              <Badge
                                key={vibe}
                                variant={vibe === userVibe ? 'default' : 'secondary'}
                                className="gap-1"
                              >
                                {getVibeIcon(vibe as Vibe)} {count}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      
                      {/* Matching Users Preview */}
                      {venue.matching_users.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {venue.matching_users.length} people here share your vibe:
                          </p>
                          <div className="flex items-center gap-2">
                            {venue.matching_users.slice(0, 5).map((user) => (
                              <Avatar key={user.profile_id} className="w-6 h-6">
                                <AvatarImage src={user.avatar_url || ''} />
                                <AvatarFallback className="text-xs">
                                  {user.display_name?.[0] || user.username?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {venue.matching_users.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{venue.matching_users.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1">
                          Check In Here
                        </Button>
                        <Button size="sm" variant="outline">
                          Get Directions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};