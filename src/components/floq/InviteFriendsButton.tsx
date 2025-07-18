import React, { useState } from 'react';
import { UserPlus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VariantProps } from 'class-variance-authority';
import { useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInviteToFloq } from '@/hooks/useInviteToFloq';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface Friend {
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface InviteFriendsButtonProps {
  floqId: string;
  className?: string;
  variant?: VariantProps<typeof Button>['variant'];
  size?: VariantProps<typeof Button>['size'];
  disabled?: boolean;
}

export const InviteFriendsButton: React.FC<InviteFriendsButtonProps> = ({
  floqId,
  className,
  variant = 'outline',
  size = 'default',
  disabled = false,
}) => {
  const session = useSession();
  const user = session?.user;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const { socialHaptics } = useHapticFeedback();
  const { mutateAsync: inviteToFloq, isPending: isInviting } = useInviteToFloq();

  // ------------- Friends fetch (both directions) -------------
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friends', isOpen],
    enabled: !!user && isOpen,
    queryFn: async (): Promise<Friend[]> => {
      // Signed-in user
      const {
        data: { user: me },
      } = await supabase.auth.getUser();
      if (!me?.id) return [];

      // friends where I’m user_a
      const { data: fwd, error: fwdErr } = await supabase
        .from('friends')
        .select(
          `
            user_b         as friend_id,
            profiles!friends_user_b_fkey (
              username,
              display_name,
              avatar_url
            )
          `,
        )
        .eq('user_a', me.id);

      if (fwdErr) throw fwdErr;

      // friends where I’m user_b
      const { data: rev, error: revErr } = await supabase
        .from('friends')
        .select(
          `
            user_a         as friend_id,
            profiles!friends_user_a_fkey (
              username,
              display_name,
              avatar_url
            )
          `,
        )
        .eq('user_b', me.id);

      if (revErr) throw revErr;

      const rows = [...(fwd ?? []), ...(rev ?? [])];

      return rows.map((r: any) => ({
        friend_id: r.friend_id,
        username: r.profiles?.username ?? '',
        display_name: r.profiles?.display_name ?? '',
        avatar_url: r.profiles?.avatar_url ?? undefined,
      }));
    },
  });

  // --------- Local filter + server-side user search (≥3 chars) ----------
  const localMatches = friends.filter(
    (f) =>
      f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const {
    data: userMatches = [],
    isLoading: searchLoading,
  } = useUserSearch(searchQuery, isOpen && searchQuery.trim().length >= 3);

  const results =
    searchQuery.trim().length >= 3
      ? [
          ...localMatches,
          ...userMatches.filter(
            (u) => !localMatches.some((f) => f.friend_id === u.id),
          ),
        ]
      : localMatches;

  const handleToggle = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      next.has(friendId) ? next.delete(friendId) : next.add(friendId);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selectedFriends.size === 0) return;
    try {
      await inviteToFloq({
        floqId,
        inviteeIds: Array.from(selectedFriends),
      });
      socialHaptics.connectionMade();
      setSelectedFriends(new Set());
      setIsOpen(false);
    } catch (err) {
      console.error('Invite error:', err);
    }
  };

  const FriendCard: React.FC<{ friend: Friend }> = ({ friend }) => {
    const isSelected = selectedFriends.has(friend.friend_id);
    return (
      <Card
        className={cn(
          'p-3 cursor-pointer transition-colors',
          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
        )}
        onClick={() => handleToggle(friend.friend_id)}
        role="button"
        tabIndex={0}
        aria-label={`${isSelected ? 'Remove' : 'Add'} ${friend.display_name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle(friend.friend_id);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            readOnly
            className="pointer-events-none"
          />
          <Avatar className="w-10 h-10">
            <AvatarImage src={friend.avatar_url} alt="" />
            <AvatarFallback>
              {friend.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{friend.display_name}</p>
            <p className="text-sm text-muted-foreground truncate">
              @{friend.username}
            </p>
          </div>
          {isSelected && <Check className="w-4 h-4 text-primary" />}
        </div>
      </Card>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant={variant}
                size={size}
                className={className}
                disabled={disabled}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          {disabled && (
            <TooltipContent>
              <p>Floq is at capacity</p>
            </TooltipContent>
          )}
        </Tooltip>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Friends</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            {selectedFriends.size > 0 && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {selectedFriends.size} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFriends(new Set())}
                >
                  Clear all
                </Button>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {friendsLoading || searchLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  Loading…
                </p>
              ) : results.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery.trim().length >= 3
                    ? 'No users found'
                    : 'No friends to invite'}
                </p>
              ) : (
                results.map((r: any) => (
                  <FriendCard
                    key={r.friend_id ?? r.id}
                    friend={
                      'friend_id' in r
                        ? (r as Friend)
                        : {
                            friend_id: r.id,
                            username: r.username,
                            display_name:
                              r.display_name ?? r.full_name ?? 'Unknown',
                            avatar_url: r.avatar_url,
                          }
                    }
                  />
                ))
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={selectedFriends.size === 0 || isInviting}
                onClick={handleInvite}
              >
                {isInviting && (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                )}
                Invite
                {selectedFriends.size > 0 && ` (${selectedFriends.size})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};