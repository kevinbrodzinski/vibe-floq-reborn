import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Moon, Sun, Clock, Users, Zap } from 'lucide-react';

interface FieldDebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  tileData?: any[];
  presenceData?: any[];
  clusterData?: any[];
  onTimeWarp?: (hours: number) => void;
  currentTime?: Date;
  isConstellationMode?: boolean;
  onConstellationToggle?: () => void;
}

export const FieldDebugPanel: React.FC<FieldDebugPanelProps> = ({
  isVisible,
  onToggle,
  tileData = [],
  presenceData = [],
  clusterData = [],
  onTimeWarp,
  currentTime = new Date(),
  isConstellationMode = false,
  onConstellationToggle
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

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
      >
        <Zap className="w-4 h-4 mr-2" />
        Debug
      </Button>
    );
  }

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