import { useEffect } from 'react';
import { User } from 'lucide-react';
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
import { useFriends } from '@/hooks/useFriends';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { OnlineFriendRow } from '@/components/OnlineFriendRow';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useProfileCache } from '@/hooks/useProfileCache';
import { Loader2, Check, X } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';

interface FriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFriendClick: () => void;
}

export const FriendsSheet = ({ open, onOpenChange, onAddFriendClick }: FriendsSheetProps) => {
  const { friends, friendCount, profiles, isLoading } = useFriends();
  const { pendingRequests, acceptRequest, declineRequest, isAccepting, isDeclining } = useFriendRequests();
  const { lat, lng } = useGeolocation();
  const { data: friendsNearby = [], isLoading: isLoadingNearby, debouncedPrimeProfiles } = useNearbyFriends(lat, lng, { km: 0.5 });
  const { primeProfiles } = useProfileCache();
  const navigate = useNavigate();

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
    console.log('Nearby friends:', friendsNearby);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Your friends
            {friendCount > 0 && (
              <Badge variant="secondary">{friendCount}</Badge>
            )}
          </SheetTitle>
          {friendsNearby.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={handleNearbyBadgeClick}
                aria-label={`${friendsNearby.length} friends within 500 meters`}
              >
                {friendsNearby.length} within 500m
              </Badge>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 py-4 space-y-6">
            {/* Online Friends Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Online now
                </h3>
                {isLoadingNearby && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              
              {isLoading ? (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ) : friends.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {friends.map(id => {
                    const nearbyFriend = friendsNearby.find(f => f.id === id);
                    return (
                      <OnlineFriendRow 
                        key={id} 
                        userId={id} 
                        isNearby={!!nearbyFriend}
                        distance={nearbyFriend?.distance_m}
                      />
                    );
                  })}
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
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
              )}
            </h3>
            
            {pendingRequests.length > 0 ? (
              <div className="space-y-2">
                {pendingRequests.map((request: any) => (
                  <div key={request.user_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <AvatarWithFallback 
                      src={request.profiles?.avatar_url ? getAvatarUrl(request.profiles.avatar_url, 40) : null}
                      fallbackText={request.profiles?.display_name || request.profiles?.username || 'U'}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {request.profiles?.display_name || request.profiles?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Wants to be friends
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => acceptRequest(request.user_id)}
                        disabled={isAccepting || isDeclining}
                        className="h-8 px-3"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => declineRequest(request.user_id)}
                        disabled={isAccepting || isDeclining}
                        className="h-8 px-3"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No pending requests</p>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAddFriendClick} className="w-full">
            + Add by @username
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSettingsClick}
            className="w-full"
          >
            Settings & sign-out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};