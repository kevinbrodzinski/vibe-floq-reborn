import { useEffect } from 'react';
import { User, MapPin, Share2, Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useNavigate } from 'react-router-dom';
import { useGeo } from '@/hooks/useGeo';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useProfileCache } from '@/hooks/useProfileCache';
import { useRealtimeFriends } from '@/hooks/useRealtimeFriends';
import { Loader2, Check, X } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { OnlineFriendRow } from '@/components/OnlineFriendRow';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFriendClick: () => void;
}

export const FriendsSheet = ({ open, onOpenChange, onAddFriendClick }: FriendsSheetProps) => {
  const { rows: friendsWithPresence, friendIds, isLoading } = useUnifiedFriends();
  const { pendingIn, accept, updating } = useUnifiedFriends();
  const { coords } = useGeo();
  const lat = coords?.lat;
  const lng = coords?.lng;
  const { data: friendsNearby = [], isLoading: isLoadingNearby, debouncedPrimeProfiles } = useNearbyFriends(lat, lng, { km: 0.5 });
  const { primeProfiles } = useProfileCache();
  const navigate = useNavigate();

  // Get sharing preferences
  const { data: sharePrefs = {}, error: sharePrefsError } = useQuery({
    queryKey: ['share-prefs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('friend_share_pref')
        .select('other_profile_id,is_live');

      if (!data) return {};

      return Object.fromEntries(data.map(r => [r.other_profile_id, r.is_live]));
    },
    retry: false, // Don't retry if QueryClient isn't ready
  });

  // Enable realtime friend updates
  useRealtimeFriends();

  // Prime profile cache for nearby friends with debouncing
  useEffect(() => {
    if (friendsNearby.length > 0) {
      const formattedFriends = friendsNearby.map(f => ({
        id: f.id,
        display_name: f.display_name,
        avatar_url: f.avatar_url,
        created_at: '2024-01-01T00:00:00Z', // Use a consistent timestamp for cache consistency
      }));
      debouncedPrimeProfiles(primeProfiles, formattedFriends);
    }
  }, [friendsNearby, primeProfiles, debouncedPrimeProfiles]);

  const handleSettingsClick = () => {
    onOpenChange(false);
    // Navigate to settings when that screen exists
    // navigate('/settings');
  };

  const handleNearbyBadgeClick = () => {
    // Scroll to friends list or highlight nearby friends
    // For now, we'll just close the sheet and potentially show on map
  };

  const sharingCount = Object.values(sharePrefs).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Your friends
            {friendIds.length > 0 && (
              <Badge variant="secondary">{friendIds.length}</Badge>
            )}
          </SheetTitle>

          {/* Location Sharing Summary */}
          <div className="flex items-center gap-3 pt-2">
            {friendsNearby.length > 0 && (
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent/10 transition-colors bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                onClick={handleNearbyBadgeClick}
                aria-label={`${friendsNearby.length} friends within 500 meters`}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {friendsNearby.length} within 500m
              </Badge>
            )}

            {Object.keys(sharePrefs).length > 0 && (
              <Badge
                variant="outline"
                className={`flex items-center gap-1 ${sharingCount > 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                  : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                  }`}
              >
                <Share2 className="h-3 w-3" />
                {sharingCount} sharing location
                {sharingCount > 0 && (
                  <span className="ml-1 text-xs">• Active</span>
                )}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 py-4 space-y-6">
          {/* Friends Section */}
          <div>
            {isLoading ? (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ) : friendsWithPresence.length > 0 ? (
              <div className="space-y-4">
                {/* Online Friends */}
                {(() => {
                  const onlineFriends = friendsWithPresence.filter(f => f.online);
                  const offlineFriends = friendsWithPresence.filter(f => !f.online);

                  return (
                    <>
                      {onlineFriends.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">
                              Online now
                            </h3>
                            {isLoadingNearby && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {onlineFriends.map(friend => {
                              const nearbyFriend = friendsNearby.find(f => f.id === friend.friend_id);
                              return (
                                <OnlineFriendRow
                                  key={friend.friend_id}
                                  profileId={friend.friend_id}
                                  isNearby={!!nearbyFriend}
                                  distance={nearbyFriend?.distance_m}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {offlineFriends.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">
                              Offline
                            </h3>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {offlineFriends.map(friend => {
                              const nearbyFriend = friendsNearby.find(f => f.id === friend.friend_id);
                              return (
                                <OnlineFriendRow
                                  key={friend.friend_id}
                                  profileId={friend.friend_id}
                                  isNearby={!!nearbyFriend}
                                  distance={nearbyFriend?.distance_m}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No friends yet</p>
                <p className="text-sm">Add friends to see them here</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Pending Requests Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Pending requests
              {pendingIn.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingIn.length}</Badge>
              )}
            </h3>

            {pendingIn.length > 0 ? (
              <div className="space-y-2">
                {pendingIn.map((request) => {
                  return (
                    <div key={request.friend_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <AvatarWithFallback
                        src={request.avatar_url ? getAvatarUrl(request.avatar_url, 40) : null}
                        fallbackText={request.display_name || request.username || 'U'}
                        className="w-10 h-10"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {request.display_name || request.username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Wants to be friends
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => accept(request.friend_id)}
                          disabled={updating}
                          className="h-8 px-3"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => accept(request.friend_id)} // Note: Using accept for now, could add decline later
                          disabled={updating}
                          className="h-8 px-3"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No pending requests</p>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="flex flex-row justify-between items-center p-4 border-t border-border">
          <Button variant="ghost" onClick={handleSettingsClick} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};