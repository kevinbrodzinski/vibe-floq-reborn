import { GlassCard } from './GlassCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveVibeCardProps {
  vibe: {
    vibe: string;
    timestamp: string;
    location?: string;
  };
}

export const LiveVibeCard = ({ vibe }: LiveVibeCardProps) => {
  const getVibeColor = (vibeType: string) => {
    const colors = {
      hype: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      chill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      social: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      flowing: 'bg-green-500/20 text-green-300 border-green-500/40',
      romantic: 'bg-red-500/20 text-red-300 border-red-500/40',
      solo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      weird: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      down: 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    };
    return colors[vibeType as keyof typeof colors] || colors.social;
  };

  return (
    <GlassCard>
      <h3 className="text-lg font-light text-white mb-3">Current Vibe</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`${getVibeColor(vibe.vibe)} border font-medium capitalize`}>
            {vibe.vibe}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(vibe.timestamp), { addSuffix: true })}
          </div>
        </div>
      </div>
      {vibe.location && (
        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {vibe.location}
        </div>
      )}
    </GlassCard>
  );
};