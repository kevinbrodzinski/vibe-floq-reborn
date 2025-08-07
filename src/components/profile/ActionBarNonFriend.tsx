import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Zap } from 'lucide-react';
import { useAtomicFriendships } from '@/hooks/useAtomicFriendships';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/profile';

export interface ActionBarNonFriendProps {
  profile: Profile;
  isPending?: boolean;
}

export const ActionBarNonFriend = ({ profile, isPending = false }: ActionBarNonFriendProps) => {
  const { toast } = useToast();
  const { sendFriendRequest, isSending } = useAtomicFriendships();

  const handleAddFriend = async () => {
    if (!profile?.id || isSending) return;
    
    try {
      sendFriendRequest(profile.id);
      // Success toast is handled by the hook
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Error sending friend request:', error);
    }
  };

  const handleWave = () => {
    // TODO: Implement wave/ping functionality
    toast({
      title: "Wave sent! ✨",
      description: `You waved at @${profile.username}`,
    });
  };

  if (isPending) {
    return (
      <div className="flex gap-3">
        <Badge 
          variant="outline" 
          className="flex-1 justify-center px-4 py-3 text-sm border-primary text-primary min-h-[44px] flex items-center"
        >
          Pending
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleWave}
          className="border border-white/20 text-white hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleAddFriend}
        disabled={isSending}
        className="flex-1 bg-gradient-primary text-white font-medium border-0 min-h-[44px] touch-manipulation"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        {isSending ? 'Sending...' : 'Add Friend'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleWave}
        className="border border-white/20 text-white hover:bg-white/10 min-h-[44px] min-w-[44px] touch-manipulation"
      >
        <Zap className="h-4 w-4" />
      </Button>
    </div>
  );
};