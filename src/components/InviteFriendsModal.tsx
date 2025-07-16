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

// Mock friends data - would come from API
const mockFriends: Friend[] = [
  { id: '1', username: 'alex_chen', display_name: 'Alex Chen', avatar_url: '' },
  { id: '2', username: 'sarah_k', display_name: 'Sarah Kim', avatar_url: '' },
  { id: '3', username: 'mike_jones', display_name: 'Mike Jones', avatar_url: '' },
  { id: '4', username: 'emma_w', display_name: 'Emma Wilson', avatar_url: '' },
];

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

  const filteredFriends = mockFriends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Search friends */}
      <div className="space-y-2">
        <Label>Find Friends</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Friends list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filteredFriends.map((friend) => (
          <div
            key={friend.id}
            onClick={() => handleFriendToggle(friend.id)}
            className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
              selectedFriends.includes(friend.id)
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-card/50 border border-transparent'
            }`}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={friend.avatar_url} />
              <AvatarFallback>
                {friend.display_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-sm">{friend.display_name}</div>
              <div className="text-xs text-muted-foreground">@{friend.username}</div>
            </div>
            {selectedFriends.includes(friend.id) && (
              <UserPlus className="w-4 h-4 text-primary" />
            )}
          </div>
        ))}
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