import React, { useMemo } from 'react';
import { useFieldSocial } from '@/components/field/contexts/FieldSocialContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, MapPin, Clock, Users } from 'lucide-react';
import { getVibeIcon } from '@/utils/vibeIcons';

interface FriendSuggestionCarouselProps {
  onStartChat?: (friendId: string) => void;
  onShowOnMap?: (friendId: string) => void;
}

export const FriendSuggestionCarousel: React.FC<FriendSuggestionCarouselProps> = ({
  onStartChat,
  onShowOnMap
}) => {
  const { people, profilesMap } = useFieldSocial();

  // Get nearby friends with enhanced data
  const nearbyFriends = useMemo(() => {
    return people
      .filter(person => person.isFriend)
      .map(person => {
        const profile = profilesMap.get(person.id);
        
        // Calculate screen distance using already-projected coordinates
        // person.x and person.y are already screen coordinates from projectLatLng
        const distance = Math.sqrt(
          Math.pow(person.x - 500, 2) + Math.pow(person.y - 500, 2)
        );
        
        return {
          ...person,
          profile,
          distance,
          lastSeen: 'Active now', // Could be enhanced with real last seen data
          activity: getActivityStatus(person.vibe, distance)
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6); // Show top 6 nearest friends
  }, [people, profilesMap]);

  const getActivityStatus = (vibe: string, distance: number): string => {
    if (distance < 100) return 'Very close';
    if (distance < 300) return 'Nearby';
    if (distance < 600) return 'In area';
    return 'Further away';
  };

  const getDistanceText = (distance: number): string => {
    if (distance < 100) return '< 100m';
    if (distance < 500) return `~${Math.round(distance / 50) * 50}m`;
    return `~${Math.round(distance / 100) / 10}km`;
  };

  if (nearbyFriends.length === 0) {
    return (
      <Card className="p-4 bg-background/80 backdrop-blur-sm border">
        <div className="text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No friends nearby</p>
          <p className="text-xs">Friends will appear here when they're active in your area</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-background/80 backdrop-blur-sm border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Friends Nearby ({nearbyFriends.length})
          </h3>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {nearbyFriends.map((friend) => (
            <div 
              key={friend.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {/* Avatar */}
              <Avatar className="w-10 h-10">
                <AvatarImage src={friend.profile?.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {friend.profile?.display_name?.slice(0, 2).toUpperCase() || 
                   friend.name?.slice(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>

              {/* Friend Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {friend.profile?.display_name || friend.name}
                  </span>
                  <span className="text-lg">{getVibeIcon(friend.vibe)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{getDistanceText(friend.distance)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{friend.lastSeen}</span>
                  </div>
                </div>

                <Badge variant="secondary" className="text-xs mt-1">
                  {friend.activity}
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onShowOnMap?.(friend.id)}
                  className="h-8 w-8 p-0"
                >
                  <MapPin className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartChat?.(friend.id)}
                  className="h-8 w-8 p-0"
                >
                  <MessageCircle className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {nearbyFriends.length > 3 && (
          <div className="text-xs text-center text-muted-foreground">
            Showing closest friends • Scroll for more
          </div>
        )}
      </div>
    </Card>
  );
};