
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserTag } from '@/components/ui/user-tag';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { AddFriendButton } from '@/components/friends/AddFriendButton';
import { DiscoverUser } from '@/hooks/useFriendDiscovery';
import { useQueryClient } from '@tanstack/react-query';
import { sendFriendRequest } from '@/lib/friends';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserSearchResultsProps {
  users: DiscoverUser[];
  searchQuery: string;
  isLoading?: boolean;
  selectedIndex?: number;
}

export const UserSearchResults = ({ 
  users, 
  searchQuery,
  isLoading = false,
  selectedIndex = -1 
}: UserSearchResultsProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddFriend = async (targetId: string) => {
    try {
      await sendFriendRequest(targetId);
      
      // Optimistic cache update - invalidate both discover and friends
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });

      toast({
        title: "Friend request sent",
        description: "Your request has been sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    }
  };
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 h-4 bg-muted rounded" />
            <div className="w-16 h-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {users.map((user) => {
        // Convert DiscoverProfile to Profile format for UserTag
        const userAsProfile = {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          created_at: new Date().toISOString(), // Default value since DiscoverProfile doesn't have this
        };

        return (
          <div 
            key={user.id} 
            className={`flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer ${
              selectedIndex === users.indexOf(user) ? 'bg-accent' : ''
            }`}
            onClick={() => navigate(`/u/${user.username}`)}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={getAvatarUrl(user.avatar_url, 32)} />
              <AvatarFallback>
                {getInitials(user.display_name, user.username)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <UserTag profile={userAsProfile} />
            </div>
            
            <AddFriendButton
              status={user.req_status}
              onAdd={(e) => {
                e?.stopPropagation(); // Prevent navigation when clicking Add Friend
                handleAddFriend(user.id);
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
