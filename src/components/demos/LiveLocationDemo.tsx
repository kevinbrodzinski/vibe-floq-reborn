import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FriendShareToggle } from '@/components/friends/FriendShareToggle';
import { LiveMap } from '@/components/map/LiveMap';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { supabase } from '@/integrations/supabase/client';

export function LiveLocationDemo() {
  const { coords, isTracking, startTracking, stopTracking } = useUnifiedLocation({
    enableTracking: true,
    enablePresence: true,
    hookId: 'live-location-demo'
  });
  const pos = coords; // Compatibility alias
  const [mockFriendIds, setMockFriendIds] = useState<string[]>([]);
  const [profileId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        // Mock some friend IDs for demo
        setMockFriendIds([
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001'
        ]);
      }
    });
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Live Location Sharing Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location tracking controls */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={isTracking ? stopTracking : startTracking}
              variant={isTracking ? "destructive" : "default"}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
            {pos && (
              <div className="text-sm text-muted-foreground">
                Location: {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)} (±{Math.round(pos.accuracy)}m)
              </div>
            )}
          </div>

          {/* Friend sharing toggles */}
          {profileId && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Share Location With Friends</h3>
              {mockFriendIds.map((friendId, index) => (
                <div key={friendId} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Friend {index + 1} ({friendId.slice(0, 8)}...)</span>
                  <FriendShareToggle friendId={friendId} initial={false} />
                </div>
              ))}
            </div>
          )}

          {/* Live map */}
          <LiveMap friendIds={mockFriendIds} className="min-h-[300px]" />
        </CardContent>
      </Card>
    </div>
  );
}