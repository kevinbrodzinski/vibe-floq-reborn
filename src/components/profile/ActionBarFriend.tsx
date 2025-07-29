import { Button } from '@/components/ui/button';
import { MessageCircle, Zap, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/profile';

interface ActionBarFriendProps {
  profile: Profile;
  onOpenDM: () => void;
}

export const ActionBarFriend = ({ profile, onOpenDM }: ActionBarFriendProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

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
        onClick={handleWave}
        className="border border-white/20 text-white hover:bg-white/10"
      >
        <Zap className="h-4 w-4" />
      </Button>
      <Button
        variant={isSharing ? "default" : "ghost"}
        size="icon"
        onClick={toggleLocationShare}
        className={
          isSharing 
            ? "bg-green-500 text-white hover:bg-green-600"
            : "border border-white/20 text-white hover:bg-white/10"
        }
      >
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  );
};