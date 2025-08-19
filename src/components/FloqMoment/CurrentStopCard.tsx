import React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        <img src={photoUrl} alt={venueName} className="w-full h-45 object-cover" />
      ) : (
        <div className="h-45 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground">Venue photo</span>
        </div>
      )}
      <CardHeader>
        <h3 className="text-xl font-bold">{venueName}</h3>
        <div className="flex items-center gap-3">
          <span>Friends here: {friendsHere}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <span className="text-sm text-muted-foreground">Live vibe</span>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${Math.round(vibePulse0to1 * 100)}%` }}
          />
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2">
          <Button onClick={onOnMyWay} variant="outline">On my way</Button>
          <Button onClick={onHere}>I'm here</Button>
          <Button onClick={onSkip} variant="secondary">Skip</Button>
        </div>
      </CardFooter>
    </Card>
  );
}