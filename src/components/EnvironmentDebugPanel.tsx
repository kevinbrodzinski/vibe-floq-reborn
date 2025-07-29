
import React, { useState } from 'react';
import { X, Settings, Eye, Network, MapPin, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';
import { LocationSharingTest } from '@/components/test/LocationSharingTest';

interface EnvironmentDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  debugConfig: {
    debugPresence: boolean;
    debugNetwork: boolean;
    debugGeohash: boolean;
    debugLocationSharing: boolean;
  };
  onConfigChange: (config: any) => void;
}

export const EnvironmentDebugPanel: React.FC<EnvironmentDebugPanelProps> = ({
  isOpen,
  onClose,
  debugConfig,
  onConfigChange
}) => {
  if (!isOpen) return null;

  const handleToggle = (key: string, value: boolean) => {
    onConfigChange({
      ...debugConfig,
      [key]: value
    });
  };

  return (
    <div
      {...zIndex('debug')}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Environment Debug
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Debug Presence</span>
            </div>
            <Switch
              checked={debugConfig.debugPresence}
              onCheckedChange={(value) => handleToggle('debugPresence', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Debug Network</span>
            </div>
            <Switch
              checked={debugConfig.debugNetwork}
              onCheckedChange={(value) => handleToggle('debugNetwork', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Debug Geohash</span>
            </div>
            <Switch
              checked={debugConfig.debugGeohash}
              onCheckedChange={(value) => handleToggle('debugGeohash', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Debug Location Sharing</span>
            </div>
            <Switch
              checked={debugConfig.debugLocationSharing}
              onCheckedChange={(value) => handleToggle('debugLocationSharing', value)}
            />
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                ENV: {import.meta.env.MODE}
              </Badge>
              <Badge variant="outline" className="text-xs">
                DEV: {import.meta.env.DEV ? 'true' : 'false'}
              </Badge>
            </div>
          </div>

          {/* Location Sharing Test Component */}
          {debugConfig.debugLocationSharing && (
            <div className="pt-3 border-t border-border">
              <LocationSharingTest />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
