import React from 'react';
import { Card, CardHeader, CardFooter, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type CurrentStopCardProps = {
  venueName: string;
  photoUrl?: string | null;
  vibePulse0to1?: number; // 0..1
  friendsHere?: number;
  onOnMyWay?: () => void;
  onHere?: () => void;
  onSkip?: () => void;
};

export default function CurrentStopCard(props: CurrentStopCardProps) {
  const { venueName, photoUrl, vibePulse0to1 = 0.5, friendsHere = 0, onOnMyWay, onHere, onSkip } = props;
  
  return (
    <Card className="overflow-hidden">
      {photoUrl ? (
        <div className="relative">
          <img 
            src={photoUrl} 
            alt={venueName} 
            className="w-full h-[180px] object-cover"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[180px] bg-muted">
          <span className="text-sm text-muted-foreground">Venue photo</span>
        </div>
      )}
      
      <CardHeader>
        <h3 className="text-xl font-bold">{venueName}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Friends here: {friendsHere}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <span className="text-sm text-muted-foreground">Live vibe</span>
        <Progress value={Math.round(vibePulse0to1 * 100)} className="w-full" />
      </CardContent>
      
      <CardFooter>
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={onOnMyWay} className="flex-1">
            On my way
          </Button>
          <Button onClick={onHere} className="flex-1">
            I'm here
          </Button>
          <Button variant="secondary" onClick={onSkip} className="flex-1">
            Skip
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}