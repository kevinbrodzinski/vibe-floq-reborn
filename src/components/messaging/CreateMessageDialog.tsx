import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle, Users, UserCheck, Clock, X } from 'lucide-react';
import { useFriendDiscovery } from '@/hooks/useFriendDiscovery';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';

interface CreateMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfileId: string;
  onThreadCreated: (threadId: string, friendProfileId: string) => void;
}

interface SearchUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  req_status?: 'none' | 'pending_out' | 'pending_in' | 'friends';
}

export const CreateMessageDialog: React.FC<CreateMessageDialogProps> = ({
  open,
  onOpenChange,
  currentProfileId,
  onThreadCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Get friends list for quick access
  const { rows: friendsWithPresence } = useUnifiedFriends();
  const friends = friendsWithPresence
    .filter(row => row.friend_state === 'accepted')
    .map(row => ({
      id: row.id,
      display_name: row.display_name || row.username || '',
      username: row.username || '',
      avatar_url: row.avatar_url,
      req_status: 'friends' as const,
    }));

  // Search for users (includes friends and discoverable users)
  const { data: searchResults = [], isLoading: isSearching } = useFriendDiscovery(debouncedSearch);
  
  // Combine friends and search results, prioritizing friends
  const searchUsers: SearchUser[] = React.useMemo(() => {
    if (!debouncedSearch) {
      // Show recent friends when no search query
      return friends.slice(0, 10);
    }
    
    // Filter friends first
    const filteredFriends = friends.filter(friend =>
      friend.display_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      friend.username?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    
    // Add search results that aren't already in friends
    const additionalUsers = searchResults.filter(user =>
      !friends.find(friend => friend.id === user.id)
    );
    
    return [...filteredFriends, ...additionalUsers];
  }, [debouncedSearch, friends, searchResults]);

  const handleUserSelect = useCallback(async (user: SearchUser) => {
    if (user.id === currentProfileId) {
      toast({
        title: "Can't message yourself",
        description: "Please select a different user to message.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Use the specific DM thread creation RPC function
      const { data: threadId, error } = await supabase.rpc('get_or_create_dm_thread', {
        p_profile_a: currentProfileId,
        p_profile_b: user.id
      });

      if (error) throw error;
      const raw = threadId as any;
      const threadIdStr =
        typeof raw === 'string' ? raw :
        raw?.id ?? raw?.thread_id ?? null;
      if (!threadIdStr) throw new Error('No thread ID returned');

      // Close dialog and open the thread
      onOpenChange(false);
      onThreadCreated(threadIdStr, user.id);
      
      // Reset state
      setSearchQuery('');
    } catch (error) {
      console.error('[CreateMessageDialog] Failed to create thread:', error);
      toast({
        title: "Failed to start conversation",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [currentProfileId, onOpenChange, onThreadCreated, toast]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onOpenChange(false);
  }, [onOpenChange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'friends':
        return <UserCheck className="w-3 h-3 text-green-500" />;
      case 'pending_out':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'pending_in':
        return <Clock className="w-3 h-3 text-blue-500" />;
      default:
        return <Users className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'friends':
        return 'Friend';
      case 'pending_out':
        return 'Request sent';
      case 'pending_in':
        return 'Request received';
      default:
        return 'Not connected';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'friends':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending_out':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'pending_in':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              New Message
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Search for someone to start a conversation with
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends or enter username..."
              className="pl-10 pr-8"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Quick stats */}
          {!debouncedSearch && friends.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                {friends.length} friends
              </span>
            </div>
          )}

          {debouncedSearch && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {searchUsers.length > 0 
                  ? `Found ${searchUsers.length} result${searchUsers.length !== 1 ? 's' : ''}`
                  : isSearching ? 'Searching...' : 'No results found'
                }
              </span>
            </div>
          )}

          {/* User Results */}
          <ScrollArea className="h-64">
            {isSearching && debouncedSearch && (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Searching...</div>
              </div>
            )}

            {!isSearching && searchUsers.length === 0 && debouncedSearch && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-sm text-muted-foreground">No users found</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Try searching by username or display name
                </div>
              </div>
            )}

            {!debouncedSearch && searchUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground">Start typing to search for people</div>
              </div>
            )}

            <div className="space-y-1">
              {/* Group friends first, then others */}
              {searchUsers.filter(u => u.req_status === 'friends').length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Friends
                  </div>
                  {searchUsers.filter(u => u.req_status === 'friends').map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onSelect={handleUserSelect}
                      getStatusIcon={getStatusIcon}
                      getStatusText={getStatusText}
                      getStatusColor={getStatusColor}
                      isCreating={isCreating}
                    />
                  ))}
                  {searchUsers.filter(u => u.req_status !== 'friends').length > 0 && (
                    <Separator className="my-2" />
                  )}
                </>
              )}
              
              {searchUsers.filter(u => u.req_status !== 'friends').length > 0 && (
                <>
                  {searchUsers.filter(u => u.req_status === 'friends').length > 0 && (
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Other users
                    </div>
                  )}
                  {searchUsers.filter(u => u.req_status !== 'friends').map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onSelect={handleUserSelect}
                      getStatusIcon={getStatusIcon}
                      getStatusText={getStatusText}
                      getStatusColor={getStatusColor}
                      isCreating={isCreating}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface UserRowProps {
  user: SearchUser;
  onSelect: (user: SearchUser) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusText: (status: string) => string;
  getStatusColor: (status: string) => string;
  isCreating: boolean;
}

const UserRow: React.FC<UserRowProps> = ({ 
  user, 
  onSelect, 
  getStatusIcon, 
  getStatusText, 
  getStatusColor,
  isCreating 
}) => {
  return (
    <div
      onClick={() => !isCreating && onSelect(user)}
      className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-md transition-colors ${
        isCreating ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={getAvatarUrl(user.avatar_url, 40)} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getInitials(user.display_name, user.username)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {user.display_name || user.username}
        </div>
        {user.username && user.display_name !== user.username && (
          <div className="text-xs text-muted-foreground">
            @{user.username}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="secondary" 
            className={`text-xs px-2 py-0 h-5 ${getStatusColor(user.req_status || 'none')}`}
          >
            <div className="flex items-center gap-1">
              {getStatusIcon(user.req_status || 'none')}
              {getStatusText(user.req_status || 'none')}
            </div>
          </Badge>
        </div>
      </div>

      <MessageCircle className="w-4 h-4 text-muted-foreground" />
    </div>
  );
};