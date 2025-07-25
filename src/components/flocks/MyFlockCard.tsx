import { FlockAvatar } from './FlockAvatar';
import type { MyFloq } from '@/hooks/useMyFlocks';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Crown, Clock, MessageCircle, Zap } from 'lucide-react';

interface MyFlockCardProps {
  flock: MyFloq;
  onOpen?: (flock: MyFloq) => void;
}

export function MyFlockCard({ flock, onOpen }: MyFlockCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen?.(flock);
    }
  };

  // Demo data for enhanced card display
  const isHost = flock.is_creator;
  const hostName = 'Jamie'; // Demo host name
  const description = 'Chilling hard with good vibes and great company. Always down for spontaneous adventures and deep conversations.';
  const nextPlan = { time: '9:30pm', venue: 'Blue Bottle', date: 'Today' };
  const unreadCount = 2; // Demo unread count
  const isLive = flock.starts_at && new Date(flock.starts_at) <= new Date() && (!flock.ends_at || new Date(flock.ends_at) > new Date());
  const streak = 3; // Demo streak

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen?.(flock)}
      className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary/70 rounded-2xl relative"
    >
      <CardContent className="p-4">
        {/* Live indicator in top right corner */}
        {isLive && (
          <span className="absolute top-3 right-3 text-green-500 text-xs font-medium">
            Live
          </span>
        )}
        {/* Header with Avatar and Status */}
        <div className="flex items-start gap-4 mb-3">
          <div className="relative">
            <FlockAvatar flock={flock} size={64} glow />
            {isHost && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-foreground">{flock.title}</h3>
            </div>
            
            <p className="text-xs text-muted-foreground capitalize mb-1">
              {flock.primary_vibe} • Hosted by {hostName}
            </p>

            {/* Member count and avatars */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3 opacity-70" />
                {flock.participant_count} member{flock.participant_count !== 1 ? 's' : ''}
              </div>
              
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-background" />
                ))}
                {flock.participant_count > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-background flex items-center justify-center">
                    <span className="text-xs text-white">+{flock.participant_count - 3}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>

        {/* Bottom row with next plan and status indicators */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nextPlan && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Next: {nextPlan.venue} @ {nextPlan.time}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-400">
                <Zap className="h-3 w-3" />
                <span>{streak} nights</span>
              </div>
            )}
            
            {unreadCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <MessageCircle className="h-3 w-3" />
                <span>{unreadCount}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}