
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, Mail, UserPlus } from 'lucide-react';
import { usePlanParticipants } from '@/hooks/usePlanParticipants';
import { useInviteFriends } from '@/hooks/useInviteFriends';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useUserSearch } from '@/hooks/useUserSearch';

interface InviteFriendsModalProps {
  floqId: string;
  onClose: () => void;
  onComplete: (participants: string[]) => void;
  inline?: boolean;
}

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export const InviteFriendsModal = ({ 
  floqId, 
  onClose, 
  onComplete, 
  inline = false 
}: InviteFriendsModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [emailInvites, setEmailInvites] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  
  const { toast } = useToast();
  const { mutate: inviteFriends, isPending } = useInviteFriends();
  
  // Get friends data with auth state
  const { rows: friendsWithPresence, sendRequest, updating, isLoading: friendsLoading } = useUnifiedFriends();
  
  // Convert unified friends to simple profile format
  const friends = friendsWithPresence.filter(row => row.friend_state === 'accepted').map(row => ({
    id: row.id,
    username: row.username || '',
    display_name: row.display_name || row.username || '',
    avatar_url: row.avatar_url
  }));
  
  const isAuthed = true; // Assuming user is authenticated if using this component
  
  // Search users when query is long enough and user is authenticated
  const { data: searchResults = [], isLoading: searchLoading } = useUserSearch(searchQuery, isAuthed);

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Merge friends and search results, avoiding duplicates
  const mergedResults = searchQuery.length > 2 
    ? [
        ...filteredFriends,
        ...searchResults.filter(user => 
          !filteredFriends.find(friend => friend.id === user.id)
        )
      ]
    : filteredFriends;

  const isLoading = friendsLoading || searchLoading;
  const isEmpty = !isLoading && mergedResults.length === 0;

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && email.includes('@') && !emailInvites.includes(email)) {
      setEmailInvites(prev => [...prev, email]);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailInvites(prev => prev.filter(e => e !== email));
  };

  const handleInvite = () => {
    const allInvites = [...selectedFriends, ...emailInvites];
    
    if (allInvites.length === 0) {
      onComplete([]);
      return;
    }

    inviteFriends({
      plan_id: floqId,
      emails: emailInvites
    }, {
      onSuccess: () => {
        toast({
          title: "Invitations sent!",
          description: `Invited ${allInvites.length} people to the plan`
        });
        onComplete(allInvites);
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Failed to send invites",
          description: error.message
        });
      }
    });
  };

  const content = (
    <div className="space-y-6">
      {!isAuthed ? (
        <div className="py-8 text-center space-y-4">
          <p className="text-muted-foreground">Please sign in to invite friends</p>
          <Button onClick={() => window.location.href = '/auth'}>
            Sign In
          </Button>
        </div>
      ) : (
        <>
          {/* Search friends */}
          <div className="space-y-2">
            <Label>Find Friends</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends and users..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Results list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="flex-1 h-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : isEmpty ? (
              <div className="text-center py-4 text-muted-foreground">
                {searchQuery.length > 2 ? 'No users found' : 'No friends to invite yet'}
              </div>
            ) : (
              mergedResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleFriendToggle(user.id)}
                  className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedFriends.includes(user.id)
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-card/50 border border-transparent'
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.display_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{user.display_name}</div>
                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                  </div>
                  {selectedFriends.includes(user.id) && (
                    <UserPlus className="w-4 h-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Email invites */}
          <div className="space-y-2">
            <Label>Invite by Email</Label>
            <div className="flex gap-2">
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="friend@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmail}
                disabled={!emailInput.includes('@')}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {emailInvites.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {emailInvites.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {(selectedFriends.length > 0 || emailInvites.length > 0) && (
            <div className="bg-card/50 rounded-xl p-4">
              <div className="text-sm font-medium mb-2">
                Inviting {selectedFriends.length + emailInvites.length} people
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedFriends.length} floq members, {emailInvites.length} email invites
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {selectedFriends.length + emailInvites.length > 0 ? 'Skip' : 'Cancel'}
            </Button>
            <Button onClick={handleInvite} disabled={isPending}>
              {isPending ? 'Sending...' : 'Send Invites'}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
