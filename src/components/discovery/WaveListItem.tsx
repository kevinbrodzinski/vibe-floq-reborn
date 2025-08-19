import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MapPin } from 'lucide-react';

export type WaveRow = {
  cluster_id: string;
  size: number;
  friends_in_cluster: number;
  distance_m: number;
  centroid_lat: number;
  centroid_lng: number;
};

export default function WaveListItem({ wave, onPress }: { wave: WaveRow; onPress?: () => void }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-semibold">Wave size {wave.size}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{Math.round(wave.distance_m)} m • {wave.friends_in_cluster} friends</span>
            </div>
          </div>
          <Button onClick={onPress}>Let's Floq</Button>
        </div>
      </CardContent>
    </Card>
  );
}