import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Hand, 
  MapPin, 
  Plus, 
  UserMinus, 
  Shield, 
  Settings,
  MoreHorizontal 
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { useAtomicFriendships } from '@/hooks/useAtomicFriendships';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Profile } from '@/types/profile';

interface ActionBarFriendProps {
  profile: Profile;
  onOpenDM: () => void;
}

export const ActionBarFriend = ({ profile, onOpenDM }: ActionBarFriendProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const { setShowCreateSheet } = useFloqUI();
  
  // Enhanced friend management
  const { 
    removeFriend, 
    blockUser, 
    unblockUser, 
    isRemoving, 
    isBlocking, 
    isUnblocking 
  } = useAtomicFriendships();
  
  const liveShareFriends = useLiveShareFriends();
  const isCurrentlySharing = liveShareFriends.includes(profile.id);

  const handleWave = () => {
    toast({
      title: "Wave sent! ✨",
      description: `You waved at @${profile.username}`,
    });
  };

  const toggleLocationShare = () => {
    setIsSharing(!isSharing);
    toast({
      title: isSharing ? "Location sharing stopped" : "Location sharing started",
      description: isSharing 
        ? `Stopped sharing location with @${profile.username}` 
        : `Now sharing location with @${profile.username}`,
    });
  };

  const handleInviteToFloq = () => {
    setShowCreateSheet(true);
    toast({
      title: "Create Floq",
      description: `Planning something with @${profile.username}`,
    });
  };

  const handleUnfriend = () => {
    if (confirm(`Are you sure you want to unfriend ${profile.display_name || profile.username}?`)) {
      removeFriend(profile.id);
    }
  };

  const handleBlock = () => {
    if (confirm(`Are you sure you want to block ${profile.display_name || profile.username}?`)) {
      blockUser(profile.id);
    }
  };

  const handleManageLocationSharing = () => {
    // TODO: Implement location sharing toggle
    toast({
      title: "Location Sharing",
      description: `Manage location sharing with @${profile.username}`,
    });
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={onOpenDM}
        className="flex-1 bg-gradient-primary text-white font-medium border-0"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Message
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleInviteToFloq}
        className="border border-white/20 text-white hover:bg-white/10"
        title="Invite to Floq"
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleWave}
        className="border border-white/20 text-white hover:bg-white/10"
        title="Send Wave"
      >
        <Hand className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isCurrentlySharing ? "default" : "ghost"}
        size="icon"
        onClick={toggleLocationShare}
        className={
          isCurrentlySharing 
            ? "bg-green-500 text-white hover:bg-green-600"
            : "border border-white/20 text-white hover:bg-white/10"
        }
        title={isCurrentlySharing ? "Stop sharing location" : "Share location"}
      >
        <MapPin className="h-4 w-4" />
      </Button>

      {/* Enhanced Friend Management Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="border border-white/20 text-white hover:bg-white/10"
            title="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleManageLocationSharing}>
            <Settings className="h-4 w-4 mr-2" />
            Location Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleUnfriend}
            disabled={isRemoving}
            className="text-orange-600 focus:text-orange-600"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            {isRemoving ? 'Removing...' : 'Unfriend'}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleBlock}
            disabled={isBlocking}
            className="text-red-600 focus:text-red-600"
          >
            <Shield className="h-4 w-4 mr-2" />
            {isBlocking ? 'Blocking...' : 'Block User'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};