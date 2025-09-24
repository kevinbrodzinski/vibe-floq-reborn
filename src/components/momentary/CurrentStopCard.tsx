import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type CurrentStopCardProps = {
  venueName: string;
  photoUrl?: string | null;
  vibePulse0to1?: number;
  friendsHere?: number;
  onOnMyWay?: () => void;
  onHere?: () => void;
  onSkip?: () => void;
  className?: string;
};

export function CurrentStopCard({
  venueName,
  photoUrl,
  vibePulse0to1 = 0.5,
  friendsHere = 0,
  onOnMyWay,
  onHere,
  onSkip,
  className,
}: CurrentStopCardProps) {
  const pct = Math.round(Math.min(1, Math.max(0, vibePulse0to1)) * 100);
  return (
    <Card className={cn('overflow-hidden', className)}>
      {photoUrl ? (
        <img src={photoUrl} alt={venueName} className="h-44 w-full object-cover" />
      ) : (
        <div className="h-44 w-full grid place-items-center text-muted-foreground">Venue photo</div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{venueName}</CardTitle>
        <div className="text-sm text-muted-foreground">Friends here: {friendsHere}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">Live vibe</div>
        <Progress value={pct} />
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="secondary" onClick={onOnMyWay}>On my way</Button>
        <Button onClick={onHere}>I'm here</Button>
        <Button variant="outline" onClick={onSkip}>Skip</Button>
      </CardFooter>
    </Card>
  );
}