import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Clock, Zap, Heart, MessageCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useFloqJoin } from '@/hooks/useFloqJoin';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FloqEvent {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  participants: number;
  vibe: string;
  starts_at?: string;
  distance_meters?: number;
}

interface FloqInteractionSheetProps {
  floq: FloqEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (floqId: string) => void;
}

export const FloqInteractionSheet = ({
  floq,
  open,
  onOpenChange,
  onNavigate
}: FloqInteractionSheetProps) => {
  const { join, isPending } = useFloqJoin();
  const { socialHaptics } = useHapticFeedback();
  const { toast } = useToast();
  const [hasJoined, setHasJoined] = useState(false);

  if (!floq) return null;

  const handleJoinFloq = () => {
    socialHaptics.floqJoined();
    join({ floqId: floq.id });
    setHasJoined(true);
    
    toast({
      title: "Joined floq! 🎉",
      description: `You're now part of "${floq.title}"`,
    });
  };

  const handleGetDirections = () => {
    socialHaptics.gestureConfirm();
    onNavigate?.(floq.id);
    
    toast({
      title: "Navigation started! 🧭",
      description: `Getting directions to "${floq.title}"`,
    });
  };

  const handleVibeCheck = () => {
    socialHaptics.vibeMatch();
    
    toast({
      title: "Vibe check sent! ✨",
      description: `Shared your vibe with the "${floq.title}" floq`,
    });
  };

  const handleFloqChat = () => {
    socialHaptics.gestureConfirm();
    
    toast({
      title: "Floq chat opened! 💬",
      description: `Joined the conversation for "${floq.title}"`,
    });
  };

  const getVibeColor = (vibe: string) => {
    switch (vibe) {
      case 'hype': return 'text-purple-500';
      case 'social': return 'text-orange-500';
      case 'chill': return 'text-blue-500';
      case 'flowing': return 'text-cyan-500';
      case 'open': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getVibeEmoji = (vibe: string) => {
    switch (vibe) {
      case 'hype': return '🔥';
      case 'social': return '🎉';
      case 'chill': return '😌';
      case 'flowing': return '🌊';
      case 'open': return '🌟';
      default: return '✨';
    }
  };

  const timeUntilStart = floq.starts_at 
    ? formatDistanceToNow(new Date(floq.starts_at), { addSuffix: true })
    : null;

  const isWalkable = floq.distance_meters && floq.distance_meters <= 300;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-background border`}>
              <Users className={`h-6 w-6 ${getVibeColor(floq.vibe)}`} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-lg">{floq.title}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{floq.vibe}</span>
                <span>{getVibeEmoji(floq.vibe)}</span>
                {isWalkable && (
                  <Badge variant="secondary" className="text-xs">
                    Walkable
                  </Badge>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Floq Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-semibold">{floq.participants}</div>
              <div className="text-xs text-muted-foreground">People</div>
            </div>
            
            {floq.distance_meters && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-semibold">
                  {floq.distance_meters < 1000 
                    ? `${Math.round(floq.distance_meters)}m`
                    : `${(floq.distance_meters / 1000).toFixed(1)}km`
                  }
                </div>
                <div className="text-xs text-muted-foreground">Away</div>
              </div>
            )}
            
            {timeUntilStart && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-semibold">
                  {timeUntilStart.includes('ago') ? 'Live' : timeUntilStart}
                </div>
                <div className="text-xs text-muted-foreground">
                  {timeUntilStart.includes('ago') ? 'Now' : 'Starts'}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            {!hasJoined ? (
              <Button 
                onClick={handleJoinFloq}
                disabled={isPending}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Joining...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Join Floq
                  </div>
                )}
              </Button>
            ) : (
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <Heart className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <div className="text-green-700 dark:text-green-300 font-medium">
                  You're in this floq! ✨
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleGetDirections}
                className="h-11"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Directions
              </Button>
              
              <Button
                variant="outline"
                onClick={handleVibeCheck}
                className="h-11"
              >
                <Zap className="h-4 w-4 mr-2" />
                Vibe Check
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleFloqChat}
              className="w-full h-11"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Join Conversation
            </Button>
          </div>

          {/* Vibe Description */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium mb-2">Vibe: {floq.vibe}</div>
            <div className="text-sm text-muted-foreground">
              {floq.vibe === 'social' && "A fun, energetic gathering perfect for meeting new people and sharing good vibes."}
              {floq.vibe === 'chill' && "A relaxed, peaceful gathering for unwinding and enjoying calm conversations."}
              {floq.vibe === 'hype' && "High-energy excitement with music, dancing, and vibrant interactions."}
              {floq.vibe === 'flowing' && "Dynamic and adaptive, going with the flow of the moment and energy."}
              {floq.vibe === 'open' && "Welcoming and inclusive, open to all kinds of people and experiences."}
            </div>
          </div>

          {/* Walking Instructions for nearby floqs */}
          {isWalkable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Walking Distance
                </span>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                This floq is within easy walking distance. Perfect for a spontaneous join!
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};