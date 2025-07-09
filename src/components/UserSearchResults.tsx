import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { SearchedUser } from '@/hooks/useUserSearch';
import { getAvatarUrl, getInitials } from '@/lib/avatar';

interface UserSearchResultsProps {
  users: SearchedUser[];
  onAddFriend: (userId: string) => void;
  isLoading?: boolean;
}

export const UserSearchResults = ({ 
  users, 
  onAddFriend, 
  isLoading = false 
}: UserSearchResultsProps) => {
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
      {users.map((user) => (
        <div 
          key={user.id} 
          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={getAvatarUrl(user.avatar_url, 32)} />
            <AvatarFallback>
              {getInitials(user.display_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.display_name || 'Unknown User'}
            </p>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddFriend(user.id)}
            className="flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />
            Add
          </Button>
        </div>
      ))}
    </div>
  );
};