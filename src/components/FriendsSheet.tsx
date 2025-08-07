import { useState, useMemo, useEffect } from 'react';
import { MapPin, Share2, Settings, User, Loader2, Check, X, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button }        from '@/components/ui/button';
import { Badge }         from '@/components/ui/badge';
import { Separator }     from '@/components/ui/separator';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { OnlineFriendRow }    from '@/components/OnlineFriendRow';
import { useUnifiedFriends }  from '@/hooks/useUnifiedFriends';
import { useNearbyFriends }   from '@/hooks/useNearbyFriends';
import { useEnhancedFriendDistances } from '@/hooks/useEnhancedFriendDistances';
import { useProfileCache }    from '@/hooks/useProfileCache';

import { useGeo }             from '@/hooks/useGeo';
import { useQuery }           from '@tanstack/react-query';
import { supabase }           from '@/integrations/supabase/client';
import { getAvatarUrl }       from '@/lib/avatar';

interface FriendsSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onAddFriendClick(): void;
}

export const FriendsSheet = ({
  open,
  onOpenChange,
  onAddFriendClick,
}: FriendsSheetProps) => {
  /* ------------------------------------------------------------------ */
  /*  Data hooks                                                         */
  /* ------------------------------------------------------------------ */
  const {
    rows: friendsWithPresence,
    friendIds,
    isLoading,
    pendingIn,
    accept,
    updating,
  } = useUnifiedFriends();

  const { coords } = useGeo();
  const { data: friendsNearby = [], isLoading: isLoadingNearby, debouncedPrimeProfiles } =
    useNearbyFriends(coords?.lat, coords?.lng, { km: 0.5 });

  // Enhanced friend distance system
  const enhancedFriends = useEnhancedFriendDistances({
    maxDistance: 5000, // 5km
    enableProximityTracking: true,
    enablePrivacyFiltering: true,
    sortBy: 'distance'
  });

  const { primeProfiles } = useProfileCache();

  /* -- share prefs ---------------------------------------------------- */
  const { data: sharePrefs = {} } = useQuery({
    queryKey: ['share-prefs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('friend_share_pref')
        .select('other_profile_id,is_live');
      if (!data) return {};
      return Object.fromEntries(data.map((r) => [r.other_profile_id, r.is_live]));
    },
    staleTime: 60_000,
  });

  /* ------------------------------------------------------------------ */
  /*  Search bar state / derived lists                                   */
  /* ------------------------------------------------------------------ */
  const [search, setSearch] = useState('');

  const filteredFriends = useMemo(() => {
    if (!search.trim()) return friendsWithPresence;
    const q = search.toLowerCase();
    return friendsWithPresence.filter((f) =>
      (f.display_name || f.username || '')
        .toLowerCase()
        .includes(q),
    );
  }, [search, friendsWithPresence]);

  /* -- prime profile cache for nearby friends ------------------------- */
  useEffect(() => {
    if (friendsNearby.length === 0) return;
    const prime = friendsNearby.map((f) => ({
      id: f.id,
      display_name: f.display_name,
      avatar_url: f.avatar_url,
      created_at: '2024-01-01T00:00:00Z',
    }));
    debouncedPrimeProfiles(primeProfiles, prime);
  }, [friendsNearby, debouncedPrimeProfiles, primeProfiles]);

  /* ------------------------------------------------------------------ */
  /*  Render helpers                                                    */
  /* ------------------------------------------------------------------ */
  const sharingCount = Object.values(sharePrefs).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        {/* ───── Header ─────────────────────────────────────────────── */}
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Your friends
            {!!friendIds.length && <Badge variant="secondary">{friendIds.length}</Badge>}
          </SheetTitle>
          <SheetDescription>
            View your friends, see who's online and nearby, and manage friend requests.
          </SheetDescription>

          {/* search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends…"
              className="w-full rounded-md bg-muted/20 pl-9 pr-3 py-2 text-sm outline-none focus:bg-muted/30 focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* location-sharing summary */}
          <div className="flex items-center gap-3 pt-3">
            {!!friendsNearby.length && (
              <Badge
                variant="outline"
                className="cursor-default bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {friendsNearby.length} within 500 m
              </Badge>
            )}

            {!!Object.keys(sharePrefs).length && (
              <Badge
                variant="outline"
                className={`flex items-center gap-1 ${
                  sharingCount
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                }`}
              >
                <Share2 className="h-3 w-3" />
                {sharingCount} sharing
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* ───── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 py-4 space-y-6 overflow-y-auto">
          {/* friends list */}
          <div>
            {isLoading ? (
              /* skeleton */
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ) : filteredFriends.length ? (
              <div className="space-y-4">
                {(() => {
                  // Get list of friend IDs already shown in enhanced section (deduplicated)
                  const uniqueEnhancedFriends = enhancedFriends.friends
                    .slice(0, 5)
                    .reduce<typeof enhancedFriends.friends>((acc, friend) => {
                      if (!acc.some(f => f.friend.profileId === friend.friend.profileId)) {
                        acc.push(friend);
                      }
                      return acc;
                    }, []);
                  
                  const enhancedFriendIds = new Set(
                    uniqueEnhancedFriends.map(fd => fd.friend.profileId)
                  );
                  
                  // Filter out friends already shown in enhanced section and deduplicate
                  const online = filteredFriends
                    .filter((f) => f.online && !enhancedFriendIds.has(f.id))
                    .reduce<typeof filteredFriends>((acc, friend) => {
                      if (!acc.some(f => f.id === friend.id)) {
                        acc.push(friend);
                      }
                      return acc;
                    }, []);
                  
                  const offline = filteredFriends
                    .filter((f) => !f.online && !enhancedFriendIds.has(f.id))
                    .reduce<typeof filteredFriends>((acc, friend) => {
                      if (!acc.some(f => f.id === friend.id)) {
                        acc.push(friend);
                      }
                      return acc;
                    }, []);

                  return (
                    <>
                      {!!online.length && (
                        <section>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            Online now
                            {isLoadingNearby && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                          </h3>
                          <div className="space-y-1">
                            {online.map((f) => {
                              const near = friendsNearby.find((n) => n.id === f.id);
                              return (
                                <OnlineFriendRow
                                  key={f.id}
                                  profileId={f.id}
                                  isNearby={!!near}
                                  distance={near?.distance_m}
                                />
                              );
                            })}
                          </div>
                        </section>
                      )}

                      {!!offline.length && (
                        <section>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Offline
                          </h3>
                          <div className="space-y-1">
                            {offline.map((f) => {
                              const near = friendsNearby.find((n) => n.id === f.id);
                              return (
                                <OnlineFriendRow
                                  key={f.id}
                                  profileId={f.id}
                                  isNearby={!!near}
                                  distance={near?.distance_m}
                                />
                              );
                            })}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No friends match your search</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Enhanced Friend Distances - NEW FEATURE */}
          {enhancedFriends.friends.length > 0 && (
            <>
              <Separator />
              <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                Enhanced Distances
                <span className="text-xs opacity-75">(Top 5)</span>
                <Badge variant="outline" className="text-xs">
                  {enhancedFriends.nearbyCount} nearby
                </Badge>
                {enhancedFriends.highConfidenceFriends.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {enhancedFriends.highConfidenceFriends.length} high accuracy
                  </Badge>
                )}
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(() => {
                  // Deduplicate enhanced friends by profileId
                  const uniqueEnhancedFriends = enhancedFriends.friends
                    .slice(0, 5)
                    .reduce<typeof enhancedFriends.friends>((acc, friend) => {
                      if (!acc.some(f => f.friend.profileId === friend.friend.profileId)) {
                        acc.push(friend);
                      }
                      return acc;
                    }, []);
                  
                  return uniqueEnhancedFriends.map((friendDistance) => (
                    <div key={`enhanced-${friendDistance.friend.profileId}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <AvatarWithFallback
                        src={friendDistance.friend.avatarUrl}
                        fallbackText={friendDistance.friend.displayName || 'Friend'}
                        className="w-6 h-6"
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {friendDistance.friend.displayName || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {friendDistance.formattedDistance} away
                          {friendDistance.privacyFiltered && ' (privacy filtered)'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {friendDistance.isNearby && (
                        <Badge variant="default" className="text-xs px-1">
                          Near
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-1 ${
                          friendDistance.reliability === 'high' ? 'border-green-500 text-green-600' :
                          friendDistance.reliability === 'medium' ? 'border-yellow-500 text-yellow-600' :
                          'border-red-500 text-red-600'
                        }`}
                      >
                        {Math.round(friendDistance.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                  ));
                })()}
                {enhancedFriends.friends.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{enhancedFriends.friends.length - 5} more friends
                  </div>
                )}
              </div>
              </section>
            </>
          )}

          {/* System Comparison - Debug Info */}
          {process.env.NODE_ENV !== 'production' && (
            <section>
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                  System Comparison (Debug)
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                  <div>Legacy: {friendsNearby.length} friends found</div>
                  <div>Enhanced: {enhancedFriends.totalFriends} friends ({enhancedFriends.nearbyCount} nearby)</div>
                  <div>High Confidence: {enhancedFriends.highConfidenceFriends.length}</div>
                  <div>Avg Distance: {enhancedFriends.averageDistance > 0 ? enhancedFriends.formatDistance(enhancedFriends.averageDistance) : 'N/A'}</div>
                  <div>Privacy Filtering: {enhancedFriends.friends.filter(f => f.privacyFiltered).length} filtered</div>
                </div>
              </details>
            </section>
          )}

          <Separator />

          {/* pending requests */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Pending requests
              {!!pendingIn.length && (
                <Badge variant="destructive" className="ml-2">
                  {pendingIn.length}
                </Badge>
              )}
            </h3>

            {pendingIn.length ? (
              <div className="space-y-2">
                {pendingIn.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <AvatarWithFallback
                      src={
                        req.avatar_url
                          ? getAvatarUrl(req.avatar_url, 40)
                          : null
                      }
                      fallbackText={req.display_name || req.username || 'U'}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {req.display_name || req.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Wants to be friends
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => accept(req.id)}
                        disabled={updating}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => accept(req.id)} // TODO: decline
                        disabled={updating}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No pending requests
              </p>
            )}
          </section>
        </div>

        {/* ───── Footer ─────────────────────────────────────────────── */}
        <SheetFooter className="flex justify-between p-4 border-t border-border">
          <Button variant="ghost" onClick={() => { onOpenChange(false); /* navigate('/settings') */ }}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};