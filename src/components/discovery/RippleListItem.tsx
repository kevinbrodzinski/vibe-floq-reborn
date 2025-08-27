import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock } from 'lucide-react';

export type RippleRow = {
  ripple_id: string;
  includes_friend: boolean;
  both_friends: boolean;
  distance_m: number;
  expires_at: string;
};

export default function RippleListItem({ ripple }: { ripple: RippleRow }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-semibold">
                {ripple.includes_friend ? (ripple.both_friends ? 'Both friends' : 'Friend + 1') : 'Nearby pair'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{Math.round(ripple.distance_m)} m away</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(ripple.expires_at).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}