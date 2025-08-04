import React, { useState } from 'react';
import { Heart, Users, Search, X, MessageCircle, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCloseFriends, useToggleCloseFriend } from '@/hooks/useCloseFriends';
import { CloseFriend } from '@/types/closeFriends';
import { cn } from '@/lib/utils';

interface CloseFriendsListProps {
  onSelectFriend?: (friend: CloseFriend) => void;
  showActions?: boolean;
  maxDisplay?: number;
  className?: string;
  variant?: 'card' | 'list' | 'grid';
}

export const CloseFriendsList: React.FC<CloseFriendsListProps> = ({
  onSelectFriend,
  showActions = true,
  maxDisplay,
  className,
  variant = 'list',
}) => {
  const { data: closeFriends = [], isLoading, error } = useCloseFriends();
  const toggleCloseFriend = useToggleCloseFriend();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = closeFriends.filter(friend =>
    friend.friend_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedFriends = maxDisplay 
    ? filteredFriends.slice(0, maxDisplay)
    : filteredFriends;

  const handleRemoveCloseFriend = (friendId: string) => {
    toggleCloseFriend.mutate({
      friendId,
      isCloseFriend: false,
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Heart className="w-4 h-4" />
          <span>Loading close friends...</span>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-red-500 mb-2">Failed to load close friends</div>
        <div className="text-sm text-gray-500">Please try again later</div>
      </div>
    );
  }

  if (closeFriends.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Close Friends Yet
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Add your closest friends to see their content first and share special moments with them.
        </p>
      </div>
    );
  }

  const renderFriendItem = (friend: CloseFriend) => (
    <div
      key={friend.friend_id}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        variant === 'card' && 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
        variant === 'list' && 'hover:bg-gray-50 dark:hover:bg-gray-800',
        onSelectFriend && 'cursor-pointer'
      )}
      onClick={() => onSelectFriend?.(friend)}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={friend.friend_avatar_url || undefined} />
        <AvatarFallback>
          {friend.friend_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {friend.friend_name}
          </h4>
          <Heart className="w-3 h-3 text-red-500 fill-current" />
        </div>
        <p className="text-xs text-gray-500">
          Close friends since {new Date(friend.close_since || friend.friendship_created_at).toLocaleDateString()}
        </p>
      </div>

      {showActions && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8 text-gray-400 hover:text-blue-500"
            title={`Message ${friend.friend_name}`}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8 text-gray-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveCloseFriend(friend.friend_id);
            }}
            title={`Remove ${friend.friend_name} from close friends`}
            disabled={toggleCloseFriend.isPending}
          >
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-current" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Close Friends ({closeFriends.length})
          </h3>
        </div>
        {closeFriends.length > 5 && (
          <Button variant="ghost" size="sm" className="text-xs">
            Manage All
          </Button>
        )}
      </div>

      {/* Search */}
      {closeFriends.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search close friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Friends List */}
      <div className={cn(
        'space-y-2',
        variant === 'grid' && 'grid grid-cols-2 gap-3 space-y-0'
      )}>
        {displayedFriends.map(renderFriendItem)}
      </div>

      {/* Show more indicator */}
      {maxDisplay && filteredFriends.length > maxDisplay && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-xs text-gray-500">
            +{filteredFriends.length - maxDisplay} more close friends
          </Button>
        </div>
      )}

      {/* No results */}
      {searchQuery && filteredFriends.length === 0 && (
        <div className="text-center py-4">
          <div className="text-gray-500 text-sm">
            No close friends found matching "{searchQuery}"
          </div>
        </div>
      )}
    </div>
  );
};