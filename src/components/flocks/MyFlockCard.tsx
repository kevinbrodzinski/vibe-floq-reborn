import { FlockAvatar } from './FlockAvatar';
import type { MyFloq } from '@/hooks/useMyFlocks';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface MyFlockCardProps {
  flock: MyFloq;
  onOpen?: (flock: MyFloq) => void;
}

export function MyFlockCard({ flock, onOpen }: MyFlockCardProps) {
  return (
    <Card
      onClick={() => onOpen?.(flock)}
      className="cursor-pointer transition-colors hover:bg-accent/50"
    >
      <CardContent className="flex items-center gap-4 p-4">
        <FlockAvatar flock={flock} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{flock.title}</h3>
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