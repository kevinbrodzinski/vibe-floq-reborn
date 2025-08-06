import React from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useTimewarp } from '@/hooks/useTimewarp';

interface TimewarpControlsProps {
  className?: string;
}

export const TimewarpControls: React.FC<TimewarpControlsProps> = ({ className = '' }) => {
  const {
    isPlaying,
    currentIndex,
    totalFrames,
    speed,
    progress,
    currentPoint,
    play,
    pause,
    stop,
    scrubTo,
    setSpeed,
    isLoading,
  } = useTimewarp();

  const speedOptions = [0.5, 1, 2, 4, 8];

  const handleSliderChange = (value: number[]) => {
    const newIndex = Math.round((value[0] / 100) * (totalFrames - 1));
    scrubTo(newIndex);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatProgress = () => {
    if (totalFrames === 0) return '0 / 0';
    return `${currentIndex + 1} / ${totalFrames}`;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-sm text-muted-foreground">Loading location data...</div>
      </div>
    );
  }

  if (totalFrames === 0) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-sm text-muted-foreground">No location data available for the selected time period</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentPoint?.captured_at)}</span>
          <span>{formatProgress()}</span>
        </div>
        
        <Slider
          value={[progress * 100]}
          onValueChange={handleSliderChange}
          max={100}
          step={totalFrames > 0 ? 100 / (totalFrames - 1) : 1}
          className="w-full"
          disabled={totalFrames <= 1}
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlaying ? "default" : "outline"}
            onClick={isPlaying ? pause : play}
            disabled={totalFrames <= 1}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={stop}
            disabled={!isPlaying && currentIndex === 0}
            className="h-8 w-8 p-0"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => scrubTo(0)}
            disabled={currentIndex === 0}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Speed:</span>
          {speedOptions.map((speedOption) => (
            <Button
              key={speedOption}
              size="sm"
              variant={speed === speedOption ? "default" : "outline"}
              onClick={() => setSpeed(speedOption)}
              className="h-6 px-2 text-xs"
            >
              {speedOption}x
            </Button>
          ))}
        </div>
      </div>

      {/* Current Location Info */}
      {currentPoint && (
        <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg p-2">
          <div>
            <div className="font-medium">
              {currentPoint.lat.toFixed(6)}, {currentPoint.lng.toFixed(6)}
            </div>
            <div className="text-muted-foreground">
              Accuracy: ±{Math.round(currentPoint.accuracy)}m
            </div>
          </div>
          {currentPoint.venue_id && (
            <Badge variant="secondary" className="text-xs">
              Venue Stop
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};