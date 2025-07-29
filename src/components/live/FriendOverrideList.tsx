import { useFriends } from '@/hooks/useFriends';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Lock } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { useState, useEffect } from 'react';
import { useLiveSettings } from '@/hooks/useLiveSettings';

export const FriendOverrideList = () => {
    const { friendsWithPresence, isLoading: friendsLoading } = useFriends();
    const { data: liveSettings } = useLiveSettings();
    const queryClient = useQueryClient();
    const [optimisticState, setOptimisticState] = useState<Record<string, boolean>>({});

    // Get all sharing preferences
    const { data: sharePrefs = {}, isLoading: prefsLoading } = useQuery({
        queryKey: ['share-prefs'],
        queryFn: async () => {
            const { data } = await supabase
                .from('friend_share_pref')
                .select('friend_id,is_live');

            if (!data) return {};

            return Object.fromEntries(data.map(r => [r.friend_id, r.is_live]));
        }
    });

    // Auto-enable friend sharing when "friends" scope is selected
    useEffect(() => {
        if (liveSettings?.live_scope === 'friends' && 
            liveSettings.live_auto_when.includes('always') &&
            friendsWithPresence.length > 0 &&
            Object.keys(sharePrefs).length === 0) {
            
            // If no preferences exist yet and user selected friends + always, 
            // automatically enable sharing for all friends
            const enableAllFriends = async () => {
                const friendIds = friendsWithPresence.map(f => f.friend_id);
                
                try {
                    const { error } = await supabase.rpc('set_live_share_bulk', {
                        _friend_ids: friendIds,
                        _on: true,
                        _auto_when: ['always'] as any  // Cast to avoid TS enum issues
                    });
                    
                    if (!error) {
                        queryClient.invalidateQueries({ queryKey: ['share-prefs'] });
                    }
                } catch (error) {
                    console.error('Failed to auto-enable friend sharing:', error);
                }
            };
            
            enableAllFriends();
        }
    }, [liveSettings, friendsWithPresence, sharePrefs, queryClient]);

    const mutation = useMutation({
        mutationFn: async ({ friendId, isLive }: { friendId: string; isLive: boolean }) => {
            // Use the new RPC function for better consistency
            const { error } = await supabase.rpc('set_live_share_bulk', {
                _friend_ids: [friendId],
                _on: isLive,
                _auto_when: ['always'] // Use default enum value
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['share-prefs'] });
            setOptimisticState({}); // Clear optimistic state
        },
        onError: () => {
            setOptimisticState({}); // Clear optimistic state on error
        }
    });

    const toggleFriend = async (friendId: string, currentValue: boolean) => {
        const newValue = !currentValue;

        // Optimistic update
        setOptimisticState(prev => ({ ...prev, [friendId]: newValue }));

        try {
            await mutation.mutateAsync({ friendId, isLive: newValue });
        } catch (error) {
            console.error('Failed to toggle friend sharing:', error);
            // Revert optimistic state on error
            setOptimisticState(prev => ({ ...prev, [friendId]: currentValue }));
        }
    };

    if (friendsLoading || prefsLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Friend Overrides</h3>
                </div>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    // Merge optimistic state with actual state, with smart defaults
    const effectiveSharePrefs = { ...sharePrefs, ...optimisticState };
    
    // Apply smart defaults based on scope settings
    friendsWithPresence.forEach(friend => {
        if (!(friend.friend_id in effectiveSharePrefs)) {
            // If no explicit preference exists, default based on scope
            if (liveSettings?.live_scope === 'friends' && 
                liveSettings.live_auto_when.includes('always')) {
                effectiveSharePrefs[friend.friend_id] = true; // Default to sharing
            } else {
                effectiveSharePrefs[friend.friend_id] = false; // Default to not sharing
            }
        }
    });
    
    const sharingCount = Object.values(effectiveSharePrefs).filter(Boolean).length;
    const totalFriends = friendsWithPresence.length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Friend Overrides</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                    {sharingCount} of {totalFriends} sharing
                </Badge>
            </div>

            <div className="space-y-3">
                {friendsWithPresence.map((friend) => {
                    const isSharing = effectiveSharePrefs[friend.friend_id] || false;

                    return (
                        <Card key={friend.friend_id} className="border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    {/* Left: Avatar and Name */}
                                    <div className="flex items-center gap-3">
                                         <AvatarWithFallback
                                            src={friend.avatar_url ? getAvatarUrl(friend.avatar_url) : null}
                                            fallbackText={friend.display_name || 'Friend'}
                                            username={friend.username}
                                            profileId={friend.profile_id}
                                            className="h-10 w-10"
                                        />
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">
                                                {friend.display_name || friend.username || 'Unknown User'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-xs">
                                                    <Lock className="h-3 w-3 mr-1" />
                                                    {isSharing ? 'Sharing location' : 'Location hidden'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Toggle */}
                                    <Switch
                                        checked={isSharing}
                                        disabled={mutation.isPending}
                                        onCheckedChange={() => toggleFriend(friend.friend_id, isSharing)}
                                        className="data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-primary"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}; 