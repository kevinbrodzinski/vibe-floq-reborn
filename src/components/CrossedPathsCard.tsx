import { Button } from "@/components/ui/button";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import { UserPlus, MapPin, Clock } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useToast } from "@/hooks/use-toast";
import type { CrossedPath } from "@/hooks/useCrossedPathsToday";

interface CrossedPathsCardProps {
  person: CrossedPath;
}

export function CrossedPathsCard({ person }: CrossedPathsCardProps) {
  const { addFriend, isAddingFriend } = useFriends();
  const { toast } = useToast();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff <= 3) return `${daysDiff} days ago`;
    
    return date.toLocaleDateString();
  };

  const formatDistance = (meters: number) => {
    if (meters < 50) return "very close";
    if (meters < 200) return "~1 block away";
    if (meters < 500) return "~2 blocks away";
    return "nearby";
  };

  const handleAddFriend = async () => {
    try {
      await addFriend(person.user_id);
      toast({
        title: "Friend request sent",
        description: `Sent friend request to ${person.display_name}`,
      });
    } catch (error) {
      console.error('Failed to add friend:', error);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 transition-all duration-300 hover:glow-secondary hover:scale-[1.02] group">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <LazyAvatar
            avatarPath={person.avatar_url}
            displayName={person.display_name}
            size={48}
            className="border-2 border-border/40 transition-transform duration-300 group-hover:scale-110"
          />
          {/* Motion halo effect */}
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-accent/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {person.display_name}
          </h3>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Last seen: {formatTime(person.last_seen_ts)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />
            <span>
              {person.venue_name || formatDistance(person.distance_meters)}
            </span>
            {person.last_seen_vibe && (
              <>
                <span>•</span>
                <span className="text-accent font-medium">{person.last_seen_vibe}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddFriend}
        disabled={isAddingFriend}
        className="ml-4 transition-all duration-300 hover:glow-active hover:scale-105"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        {isAddingFriend ? "Sending..." : "Add"}
      </Button>
    </div>
  );
}