import React, { useState } from "react";
import { UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInviteToFloq } from "@/hooks/useInviteToFloq";
import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserSearch } from "@/hooks/useUserSearch";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";
import { VariantProps } from "class-variance-authority";

interface Friend {
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface InviteFriendsButtonProps {
  floqId: string;
  className?: string;
  variant?: VariantProps<typeof Button>["variant"];
  size?: VariantProps<typeof Button>["size"];
  disabled?: boolean;
}

export const InviteFriendsButton: React.FC<InviteFriendsButtonProps> = ({
  floqId,
  className,
  variant = "outline",
  size = "default",
  disabled = false,
}) => {
  const session = useSession();
  const user = session?.user;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { socialHaptics } = useHapticFeedback();
  const { mutateAsync: inviteToFloq, isPending: isInviting } = useInviteToFloq();

  /** -------------------------------------------------
   *  Friends query – fetch only while the dialog is open
   * ------------------------------------------------- */
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends", "all-dirs", isOpen],
    enabled: isOpen,
    queryFn: async (): Promise<Friend[]> => {
      const {
        data: { user: me },
      } = await supabase.auth.getUser();
      if (!me?.id) return [];

      // friends where I am user_a
      const { data: fwd } = await supabase
        .from("friends")
        .select(
          `
          user_b    as friend_id,
          profiles!friends_user_b_fkey ( username, display_name, avatar_url )
        `
        )
        .eq("user_a", me.id);

      // friends where I am user_b
      const { data: rev } = await supabase
        .from("friends")
        .select(
          `
          user_a    as friend_id,
          profiles!friends_user_a_fkey ( username, display_name, avatar_url )
        `
        )
        .eq("user_b", me.id);

      const rows = [...(fwd ?? []), ...(rev ?? [])];

      return rows.map((r: any) => ({
        friend_id: r.friend_id,
        username: r.profiles?.username ?? "",
        display_name: r.profiles?.display_name ?? "",
        avatar_url: r.profiles?.avatar_url ?? undefined,
      }));
    },
  });

  /** -------------------------------------------------
   *  Filter & search
   * ------------------------------------------------- */
  const filteredFriends = friends.filter(
    (f) =>
      f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Server-side search (≥3 chars)
  const { data: searchResults = [], isLoading: searchLoading } = useUserSearch(
    searchQuery,
    isOpen
  );

  const mergedResults =
    searchQuery.length >= 3
      ? [
          ...filteredFriends,
          ...searchResults.filter((u) => !filteredFriends.some((f) => f.friend_id === u.id)),
        ]
      : filteredFriends;

  /** -------------------------------------------------
   *  Helpers
   * ------------------------------------------------- */
  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selectedFriends.size === 0) return;

    await inviteToFloq({ floqId, inviteeIds: [...selectedFriends] });
    socialHaptics.connectionMade();
    setSelectedFriends(new Set());
    setIsOpen(false);
  };

  /** -------------------------------------------------
   *  Friend card
   * ------------------------------------------------- */
  const FriendCard: React.FC<{ friend: Friend }> = ({ friend }) => {
    const isSelected = selectedFriends.has(friend.friend_id);

    return (
      <Card
        className={cn(
          "p-3 cursor-pointer transition-colors",
          isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
        )}
        onClick={() => toggleFriend(friend.friend_id)}
        role="button"
        aria-label={`${isSelected ? "Remove" : "Add"} ${friend.display_name}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleFriend(friend.friend_id);
          }
        }}
      >
        <div className="flex items-center gap-3">
          {/* readOnly → disabled  (eliminates TS error) */}
          <Checkbox checked={isSelected} disabled className="pointer-events-none" />

          <Avatar className="h-10 w-10">
            <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
            <AvatarFallback>{friend.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{friend.display_name}</p>
            <p className="truncate text-sm text-muted-foreground">@{friend.username}</p>
          </div>

          {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
        </div>
      </Card>
    );
  };

  /** -------------------------------------------------
   *  Render
   * ------------------------------------------------- */
  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* trigger button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant={variant} size={size} className={className} disabled={disabled}>
                <UserPlus className="mr-2 h-4 w-4" />
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

        {/* modal */}
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Friends</DialogTitle>
          </DialogHeader>

          {/* search */}
          <Input
            placeholder="Search friends…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          {/* selected count */}
          {selectedFriends.size > 0 && (
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {selectedFriends.size} friend{selectedFriends.size > 1 ? "s" : ""} selected
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFriends(new Set())}>
                Clear all
              </Button>
            </div>
          )}

          {/* list */}
          <div className="max-h-60 space-y-2 overflow-y-auto" tabIndex={0}>
            {isLoading || searchLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : mergedResults.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery.length >= 3 ? "No users found" : "No friends to invite"}
                </p>
              </div>
            ) : (
              mergedResults.map((usr: any) => (
                <FriendCard
                  key={usr.friend_id ?? usr.id}
                  friend={
                    "friend_id" in usr
                      ? (usr as Friend)
                      : {
                          friend_id: usr.id,
                          username: usr.username,
                          display_name: usr.display_name ?? usr.full_name ?? "Unknown",
                          avatar_url: usr.avatar_url,
                        }
                  }
                />
              ))
            )}
          </div>

          {/* actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={selectedFriends.size === 0 || isInviting}
              onClick={handleInvite}
            >
              {isInviting ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Invite
              {selectedFriends.size > 0 && ` (${selectedFriends.size})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};