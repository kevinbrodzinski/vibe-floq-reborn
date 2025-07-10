
import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';
import { useUserSearch } from '@/hooks/useUserSearch';
import { UserSearchResults } from '@/components/UserSearchResults';
import { useProfileCache } from '@/hooks/useProfileCache';

interface AddFriendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddFriendModal = ({ open, onOpenChange }: AddFriendModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { addFriend, isAddingFriend } = useFriends();
  const { toast } = useToast();
  const { primeProfiles } = useProfileCache();

  // Search for users based on the query
  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(searchQuery);
  // ⚡ seed profile cache
  primeProfiles(searchResults);

  const handleAddFriend = async (userId: string) => {
    try {
      await addFriend(userId);
      setSearchQuery('');
      onOpenChange(false);
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully",
      });
    } catch (error) {
      // Error handling is done in the useFriends hook
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add friend
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by @username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isAddingFriend}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {searchQuery.trim().length >= 2 ? (
              <UserSearchResults
                users={searchResults}
                onAddFriend={handleAddFriend}
                isLoading={isSearching}
              />
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Type at least 2 characters to search for users
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
