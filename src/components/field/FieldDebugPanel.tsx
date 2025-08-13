import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Clock, Users, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { FieldTile } from '@/types/field';

interface FieldDebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  tileData?: any[];
  presenceData?: any[];
  clusterData?: any[];
  fieldTiles?: FieldTile[];
  onTimeWarp?: (hours: number) => void;
  currentTime?: Date;
  isConstellationMode?: boolean;
  onConstellationToggle?: () => void;
  showDebugVisuals?: boolean;
  onToggleDebugVisuals?: () => void;
  onRefreshTiles?: () => void;
  isRefreshing?: boolean;
}

export const FieldDebugPanel: React.FC<FieldDebugPanelProps> = ({
  isVisible,
  onToggle,
  tileData = [],
  presenceData = [],
  clusterData = [],
  fieldTiles = [],
  onTimeWarp,
  currentTime = new Date(),
  isConstellationMode = false,
  onConstellationToggle,
  showDebugVisuals = false,
  onToggleDebugVisuals,
  onRefreshTiles,
  isRefreshing = false
}) => {
  const [timeWarpValue, setTimeWarpValue] = useState([currentTime.getHours()]);
  
  const handleTimeWarp = useCallback((value: number[]) => {
    const hours = value[0];
    setTimeWarpValue([hours]);
    onTimeWarp?.(hours);
  }, [onTimeWarp]);

  const formatTime = (hours: number) => {
    const date = new Date();
    date.setHours(hours, 0, 0, 0);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isNightTime = timeWarpValue[0] < 6 || timeWarpValue[0] > 20;

  if (!isVisible) return null; // external UI (FAB) will open the panel

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 p-4 bg-background/95 backdrop-blur-sm border shadow-lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Field Debug Panel
          </h3>
          <Button onClick={onToggle} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-semibold">{tileData.length}</div>
            <div className="text-muted-foreground">Tiles</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-semibold">{presenceData.length}</div>
            <div className="text-muted-foreground">People</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-semibold">{clusterData.length}</div>
            <div className="text-muted-foreground">Clusters</div>
          </div>
        </div>

        {/* Time Warp Slider */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            <span>Time Warp</span>
            <span className="ml-auto font-mono">
              {formatTime(timeWarpValue[0])}
            </span>
          </div>
          <Slider
            value={timeWarpValue}
            onValueChange={handleTimeWarp}
            min={0}
            max={23}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>12 AM</span>
            <span>12 PM</span>
            <span>11 PM</span>
          </div>
        </div>

        {/* Constellation Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isNightTime ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>Constellation Mode</span>
          </div>
          <Button
            onClick={onConstellationToggle}
            variant={isConstellationMode ? "default" : "outline"}
            size="sm"
            disabled={!isNightTime}
          >
            {isConstellationMode ? "ON" : "OFF"}
          </Button>
        </div>

        {isNightTime && (
          <div className="text-xs text-blue-400 bg-blue-950/20 p-2 rounded border border-blue-500/20">
            🌙 Night mode active - constellation view available
          </div>
        )}

        {/* Field Tiles Debug Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Field Tiles</h3>
            <div className="flex gap-2">
              {onToggleDebugVisuals && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleDebugVisuals}
                  className="h-7 px-2 text-xs"
                >
                  {showDebugVisuals ? (
                    <EyeOff className="h-3 w-3 mr-1" />
                  ) : (
                    <Eye className="h-3 w-3 mr-1" />
                  )}
                  {showDebugVisuals ? 'Hide' : 'Show'} Overlays
                </Button>
              )}
              {onRefreshTiles && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshTiles}
                  disabled={isRefreshing}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          {/* Tile Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted/30 rounded p-2 text-center">
              <div className="font-semibold text-base">{fieldTiles.filter(t => t.crowd_count > 0).length}</div>
              <div className="text-muted-foreground">Active Tiles</div>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <div className="font-semibold text-base">{fieldTiles.reduce((sum, t) => sum + t.crowd_count, 0)}</div>
              <div className="text-muted-foreground">Total Crowd</div>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <div className="font-semibold text-base">{fieldTiles.length}</div>
              <div className="text-muted-foreground">Total Tiles</div>
            </div>
          </div>

          {/* Top 5 Tiles */}
          <div>
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">Top Crowded Tiles</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {fieldTiles
                .filter(tile => tile.crowd_count > 0)
                .sort((a, b) => b.crowd_count - a.crowd_count)
                .slice(0, 5)
                .map((tile, index) => (
                  <div 
                    key={tile.tile_id} 
                    className="flex items-center justify-between p-1.5 rounded-md bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                        #{index + 1}
                      </Badge>
                      <span className="font-mono truncate max-w-[80px]">
                        {tile.tile_id.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{
                          backgroundColor: `hsl(${tile.avg_vibe.h}, ${tile.avg_vibe.s}%, ${tile.avg_vibe.l}%)`
                        }}
                      />
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {tile.crowd_count}
                      </Badge>
                    </div>
                  </div>
                ))}
              {fieldTiles.filter(t => t.crowd_count > 0).length === 0 && (
                <div className="text-xs text-muted-foreground italic text-center py-2">
                  No active tiles found
                </div>
              )}
            </div>
          </div>

          {/* Debug Instructions */}
          {showDebugVisuals && (
            <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
              <strong>Debug Mode Active:</strong><br />
              • Hex outlines show tile boundaries<br />
              • Color indicates dominant vibe<br />
              • Size shows crowd density
            </div>
          )}
        </div>

        {/* Real-time Data */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Live Data</div>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {presenceData.slice(0, 5).map((person, index) => (
              <div key={index} className="flex justify-between bg-muted/50 p-1 rounded">
                <span className={person.isFriend ? "text-blue-400" : "text-muted-foreground"}>
                  {person.name || `User ${person.id?.slice(-4)}`}
                </span>
                <span className="text-muted-foreground">
                  {person.vibe}
                </span>
              </div>
            ))}
            {presenceData.length > 5 && (
              <div className="text-center text-muted-foreground">
                +{presenceData.length - 5} more
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};