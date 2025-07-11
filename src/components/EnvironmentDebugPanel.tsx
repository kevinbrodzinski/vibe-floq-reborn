import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  getEnvironmentConfig, 
  setPresenceMode, 
  setEnvironmentConfig, 
  clearEnvironmentOverrides,
  logEnvironmentInfo 
} from '@/lib/environment';
import { useAuth } from '@/providers/AuthProvider';

interface EnvironmentDebugPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const EnvironmentDebugPanel: React.FC<EnvironmentDebugPanelProps> = ({ 
  isOpen = false, 
  onClose 
}) => {
  const { session } = useAuth();
  const [config, setConfig] = useState(() => getEnvironmentConfig());
  const [rolloutPercentage, setRolloutPercentage] = useState(() => config.rolloutPercentage.toString());

  if (!isOpen) return null;

  const handleModeChange = (mode: 'mock' | 'stub' | 'live') => {
    setPresenceMode(mode);
  };

  const handleConfigUpdate = () => {
    const newConfig = {
      ...config,
      rolloutPercentage: parseFloat(rolloutPercentage) || 0
    };
    setEnvironmentConfig(newConfig);
    setConfig(newConfig);
    // Config updated
  };

  const handleClearOverrides = () => {
    clearEnvironmentOverrides();
  };

  const handleLogInfo = () => {
    logEnvironmentInfo();
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'mock': return 'bg-gray-500';
      case 'stub': return 'bg-yellow-500';
      case 'live': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="fixed top-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-[9999] bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Environment Debug Panel</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Mode */}
        <div>
          <Label className="text-xs font-semibold">Current Mode</Label>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getModeColor(config.presenceMode)}>
              {config.presenceMode.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {config.presenceMode === 'mock' && 'All APIs mocked'}
              {config.presenceMode === 'stub' && 'Fake data for UI testing'}
              {config.presenceMode === 'live' && 'Real API calls'}
            </span>
          </div>
        </div>

        {/* Mode Controls */}
        <div>
          <Label className="text-xs font-semibold">Switch Mode</Label>
          <div className="flex gap-2 mt-1">
            <Button 
              size="sm" 
              variant={config.presenceMode === 'mock' ? 'default' : 'outline'}
              onClick={() => handleModeChange('mock')}
            >
              Mock
            </Button>
            <Button 
              size="sm" 
              variant={config.presenceMode === 'stub' ? 'default' : 'outline'}
              onClick={() => handleModeChange('stub')}
            >
              Stub
            </Button>
            <Button 
              size="sm" 
              variant={config.presenceMode === 'live' ? 'default' : 'outline'}
              onClick={() => handleModeChange('live')}
            >
              Live
            </Button>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Features</Label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span>Realtime</span>
              <Badge variant={config.enableRealtime ? 'default' : 'secondary'}>
                {config.enableRealtime ? 'ON' : 'OFF'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Geolocation</span>
              <Badge variant={config.enableGeolocation ? 'default' : 'secondary'}>
                {config.enableGeolocation ? 'ON' : 'OFF'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Updates</span>
              <Badge variant={config.enablePresenceUpdates ? 'default' : 'secondary'}>
                {config.enablePresenceUpdates ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Debug Flags */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Debug Flags</Label>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Presence Debug</Label>
              <Switch 
                checked={config.debugPresence}
                onCheckedChange={(checked) => setConfig({...config, debugPresence: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Network Debug</Label>
              <Switch 
                checked={config.debugNetwork}
                onCheckedChange={(checked) => setConfig({...config, debugNetwork: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Geohash Debug</Label>
              <Switch 
                checked={config.debugGeohash}
                onCheckedChange={(checked) => setConfig({...config, debugGeohash: checked})}
              />
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Performance</Label>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Update Interval: {config.presenceUpdateInterval}ms</div>
            <div>Retry Delay: {config.presenceRetryDelay}ms</div>
          </div>
        </div>

        {/* Rollout Controls */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Rollout Control</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={rolloutPercentage}
              onChange={(e) => setRolloutPercentage(e.target.value)}
              className="h-8 text-xs"
              placeholder="0-100"
            />
            <span className="text-xs">%</span>
          </div>
          {session?.user?.id && (
            <div className="text-xs text-muted-foreground">
              User ID: {session.user.id.slice(0, 8)}...
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button size="sm" onClick={handleConfigUpdate} className="w-full">
            Apply Changes
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleLogInfo} className="flex-1">
              Log Info
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClearOverrides} className="flex-1">
              Clear All
            </Button>
          </div>
        </div>

        {/* URL Params Helper */}
        <div className="border-t pt-2">
          <Label className="text-xs font-semibold">Quick URL Params</Label>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>?presence=stub&debug_presence</div>
            <div>?presence=live&rollout=10</div>
            <div>?debug_network&debug_geohash</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};