import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Battery, Shield, Zap } from 'lucide-react';
import { RadiusSlider } from '@/components/RadiusSlider';
import { useUserSettings } from '@/hooks/useUserSettings';

export function PresenceSettings() {
  const { settings, updatePrivacySetting, updateBroadcastRadius, isUpdating } = useUserSettings();
  
  if (!settings) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded" />
        <div className="h-12 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
      </div>
    );
  }

  const { privacy_settings } = settings;
  const isLocationSharing = privacy_settings.location_sharing;
  const broadcastRadius = privacy_settings.broadcast_radius;
  const batterySaveMode = privacy_settings.battery_save_mode;

  const handleLocationSharingToggle = (enabled: boolean) => {
    updatePrivacySetting('location_sharing', enabled);
  };

  const handleBatterySaveToggle = (enabled: boolean) => {
    updatePrivacySetting('battery_save_mode', enabled);
  };

  const handleRadiusChange = (radius: number) => {
    updateBroadcastRadius(radius);
  };

  return (
    <div className="space-y-6">
      {/* Location Sharing */}
      <Card className="p-4 border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="location-sharing" className="font-medium">
              Share Precise Location
            </Label>
          </div>
          <Switch
            id="location-sharing"
            checked={isLocationSharing}
            onCheckedChange={handleLocationSharingToggle}
            disabled={isUpdating}
          />
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">
          Let friends see your exact location when you're sharing a vibe. 
          This helps with spontaneous meetups and nearby friend discovery.
        </p>
        
        {!isLocationSharing && (
          <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
            <Shield className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-orange-600 dark:text-orange-400">
              Location sharing is disabled. Friends won't see you nearby.
            </span>
          </div>
        )}
      </Card>

      {/* Broadcast Radius */}
      {isLocationSharing && (
        <Card className="p-4 border-border/50">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <Label className="font-medium">Broadcast Radius</Label>
              <Badge variant="outline" className="text-xs">
                {broadcastRadius}m
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              Control how far your presence reaches. Smaller radius saves battery but limits who can see you nearby.
            </p>
            
            <RadiusSlider
              km={broadcastRadius / 1000}
              onChange={(km) => handleRadiusChange(Math.round(km * 1000))}
            />
            
            {/* Radius Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/50 rounded">
                <div className="font-medium">Range</div>
                <div className="text-muted-foreground">
                  {broadcastRadius < 200 ? 'Close friends' : 
                   broadcastRadius < 800 ? 'Neighborhood' : 'Wide area'}
                </div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="font-medium">Battery</div>
                <div className="text-muted-foreground">
                  {broadcastRadius < 200 ? 'Low impact' : 
                   broadcastRadius < 800 ? 'Moderate' : 'Higher usage'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Battery Save Mode */}
      <Card className="p-4 border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Battery className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="battery-save" className="font-medium">
              Battery Save Mode
            </Label>
          </div>
          <Switch
            id="battery-save"
            checked={batterySaveMode}
            onCheckedChange={handleBatterySaveToggle}
            disabled={isUpdating}
          />
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">
          Reduces location update frequency and background activity to preserve battery life.
        </p>
        
        {batterySaveMode && (
          <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400">
              Battery optimizations active. Updates every 2-3 minutes.
            </span>
          </div>
        )}
      </Card>

      <Separator />

      {/* Privacy Summary */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Privacy Summary</span>
        </div>
        
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>• Location data is never stored permanently</div>
          <div>• Only friends can see your precise location</div>
          <div>• Presence expires automatically after 2 minutes</div>
          <div>• You can go invisible anytime from the main screen</div>
        </div>
      </Card>
    </div>
  );
}