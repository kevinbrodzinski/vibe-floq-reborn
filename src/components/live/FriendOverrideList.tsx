import { useFriends } from '@/hooks/useFriends';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Lock } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { useState } from 'react';

export const FriendOverrideList = () => {
    const { friendsWithPresence, isLoading: friendsLoading } = useFriends();
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

    const mutation = useMutation({
        mutationFn: async ({ friendId, isLive }: { friendId: string; isLive: boolean }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('No authenticated user');
            }

            const { error } = await supabase
                .from('friend_share_pref')
                .upsert({
                    friend_id: friendId,
                    is_live: isLive,
                    profile_id: user.id
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

    // Merge optimistic state with actual state
    const effectiveSharePrefs = { ...sharePrefs, ...optimisticState };
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