/**
 * LocationDebugPanel - Development tool for monitoring location system health
 * Only shown in development mode
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { locationBus } from '@/lib/location/LocationBus';
import { getFeatureFlags, enableLocationV2, disableLocationV2 } from '@/lib/feature-flags';
import { useLiveLocation } from '@/hooks/useLiveLocation';

export function LocationDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({
    subscriptions: 0,
    lastUpdate: null as Date | null
  });
  
  const flags = getFeatureFlags();
  const liveLocation = useLiveLocation();

  // Update stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        subscriptions: locationBus.getSubscriptionCount(),
        lastUpdate: new Date()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-background/80 backdrop-blur"
        >
          📍 Debug
        </Button>
      )}
      
      {isOpen && (
        <Card className="w-80 bg-background/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Location System Debug
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3 text-xs">
            {/* Feature Flags */}
            <div className="space-y-1">
              <div className="font-medium">Feature Flags</div>
              <div className="flex items-center justify-between">
                <span>Location V2:</span>
                <div className="flex items-center gap-2">
                  <Badge variant={flags.locationV2Enabled ? "default" : "secondary"}>
                    {flags.locationV2Enabled ? "ON" : "OFF"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => flags.locationV2Enabled ? disableLocationV2() : enableLocationV2()}
                  >
                    Toggle
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Presence Batching:</span>
                <Badge variant={flags.presenceBatchingEnabled ? "default" : "secondary"}>
                  {flags.presenceBatchingEnabled ? "ON" : "OFF"}
                </Badge>
              </div>
            </div>

            {/* LocationBus Stats */}
            <div className="space-y-1">
              <div className="font-medium">LocationBus</div>
              <div className="flex items-center justify-between">
                <span>Subscriptions:</span>
                <Badge variant={stats.subscriptions > 1 ? "destructive" : "default"}>
                  {stats.subscriptions}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => locationBus.refresh()}
                className="w-full"
              >
                Refresh GPS
              </Button>
            </div>

            {/* Live Location Status */}
            <div className="space-y-1">
              <div className="font-medium">Live Location</div>
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant={liveLocation.hasPermission ? "default" : "destructive"}>
                  {liveLocation.hasPermission ? "Active" : "Inactive"}
                </Badge>
              </div>
              {liveLocation.lat && liveLocation.lng && (
                <div className="text-xs text-muted-foreground">
                  {liveLocation.lat.toFixed(4)}, {liveLocation.lng.toFixed(4)}
                  {liveLocation.accuracy && ` (±${Math.round(liveLocation.accuracy)}m)`}
                </div>
              )}
              {liveLocation.error && (
                <div className="text-xs text-destructive">
                  Error: {liveLocation.error}
                </div>
              )}
              {liveLocation.updating && (
                <Badge variant="secondary" className="text-xs">
                  Updating...
                </Badge>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-1">
              <div className="font-medium">Quick Actions</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('LocationBus:', locationBus)}
                className="w-full text-xs"
              >
                Log LocationBus to Console
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}