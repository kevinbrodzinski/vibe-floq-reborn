import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePresenceDemoData } from '@/hooks/usePresenceDemoData';
import { useFieldTileSync } from '@/hooks/useFieldTileSync';
import { Slider } from '@/components/ui/slider';
import { Play, Square, RefreshCw, Eye, EyeOff, Stars, Sun } from 'lucide-react';

interface PresenceDebugPanelProps {
  showTileDebug: boolean;
  onToggleTileDebug: (show: boolean) => void;
  fieldTileCount?: number;
  lastTileUpdate?: string;
  isConstellationMode?: boolean;
  onToggleConstellationMode?: (enabled: boolean) => void;
}

/**
 * Debug panel for presence and field tile testing
 * Provides controls for seeding demo data and viewing debug information
 */
export const PresenceDebugPanel: React.FC<PresenceDebugPanelProps> = ({
  showTileDebug,
  onToggleTileDebug,
  fieldTileCount = 0,
  lastTileUpdate,
  isConstellationMode = false,
  onToggleConstellationMode,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { seedDemoData, clearDemoData, isLoading, lastSeeded } = usePresenceDemoData();
  const { triggerRefresh } = useFieldTileSync();

  const handleRefreshTiles = async () => {
    try {
      await triggerRefresh();
    } catch (error) {
      console.error('Manual tile refresh failed:', error);
    }
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-[300] w-80 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Presence Debug</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Demo Data Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Demo Data</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={seedDemoData}
              disabled={isLoading}
              className="flex-1"
            >
              <Play className="w-3 h-3 mr-1" />
              Seed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDemoData}
              disabled={isLoading}
              className="flex-1"
            >
              <Square className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
          {lastSeeded && (
            <p className="text-xs text-muted-foreground">
              Last seeded: {lastSeeded.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Field Tiles Status */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Field Tiles</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {fieldTileCount} tiles
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshTiles}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {lastTileUpdate && (
            <p className="text-xs text-muted-foreground">
              Updated: {new Date(lastTileUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Debug Visualization Toggle */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Visualization</h4>
          <div className="flex items-center justify-between">
            <span className="text-xs">Show tile boundaries</span>
            <Switch
              checked={showTileDebug}
              onCheckedChange={onToggleTileDebug}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1">
              <Stars className="w-3 h-3" />
              Constellation mode
            </span>
            <Switch
              checked={isConstellationMode}
              onCheckedChange={onToggleConstellationMode}
            />
          </div>
        </div>

        {/* Real-time Status */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Real-time</h4>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs">WebSocket connected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};