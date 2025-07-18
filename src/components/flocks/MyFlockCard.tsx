import { FlockAvatar } from './FlockAvatar';
import type { MyFloq } from '@/hooks/useMyFlocks';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Crown } from 'lucide-react';

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

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen?.(flock)}
      className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary/70 rounded-2xl"
    >
      <CardContent className="flex items-center gap-4 p-4">
        <FlockAvatar flock={flock} size={92} glow />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{flock.title}</h3>
            {flock.is_creator && (
              <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize">{flock.primary_vibe}</p>

          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-4 w-4 opacity-70" />
            {flock.participant_count} member{flock.participant_count !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}