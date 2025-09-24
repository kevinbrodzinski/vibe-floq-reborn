import React from 'react';
import { Card } from '@/components/ui/card';

interface StatsRowProps {
  venue: {
    live_count: number;
    vibe_score: number;
    popularity: number;
  };
}

export const StatsRow: React.FC<StatsRowProps> = ({ venue }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-primary">{venue.live_count}</div>
        <div className="text-sm text-muted-foreground">People Now</div>
      </Card>
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-success">{venue.vibe_score}%</div>
        <div className="text-sm text-muted-foreground">Vibe Score</div>
      </Card>
      <Card className="p-4 text-center">
        <div className="text-2xl font-bold text-info">{venue.popularity}%</div>
        <div className="text-sm text-muted-foreground">Popularity</div>
      </Card>
    </div>
  );
};