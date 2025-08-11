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
import { Search, MessageCircle } from 'lucide-react';
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
      if (!threadId) throw new Error('No thread ID returned');
      
      // Close dialog and open the thread
      onOpenChange(false);
      onThreadCreated(threadId, user.id);
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            New Message
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
              className="pl-10"
              autoFocus
            />
          </div>

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
              {searchUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-md transition-colors"
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
                    {user.req_status === 'friends' && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Friend
                      </div>
                    )}
                  </div>

                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
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