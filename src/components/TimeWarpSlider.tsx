import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Clock, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface TimeWarpData {
  hour: number;
  energy: number;
  participants: number;
  events: Array<{
    id: string;
    title: string;
    participants: number;
    vibe: string;
  }>;
  predictions?: boolean;
}

interface TimeWarpSliderProps {
  onTimeChange?: (hour: number, data: TimeWarpData) => void;
  currentHour?: number;
  isVisible?: boolean;
  onClose?: () => void;
}

export const TimeWarpSlider = ({ 
  onTimeChange, 
  currentHour = new Date().getHours(),
  isVisible = false,
  onClose 
}: TimeWarpSliderProps) => {
  const [selectedHour, setSelectedHour] = useState(currentHour);
  const [isRealTime, setIsRealTime] = useState(true);
  const { socialHaptics } = useHapticFeedback();

  // Mock historical/predictive data
  const getTimeWarpData = useCallback((hour: number): TimeWarpData => {
    const isPast = hour < currentHour;
    const isFuture = hour > currentHour;
    
    // Generate mock energy based on time of day
    const getEnergyForHour = (h: number): number => {
      if (h >= 6 && h < 9) return 0.3; // Dawn/early morning
      if (h >= 9 && h < 12) return 0.6; // Morning
      if (h >= 12 && h < 17) return 0.7; // Afternoon
      if (h >= 17 && h < 21) return 0.9; // Evening - peak
      if (h >= 21 && h < 24) return 0.8; // Night
      return 0.2; // Late night/early morning
    };

    const energy = getEnergyForHour(hour);
    const baseParticipants = Math.floor(energy * 15) + Math.floor(Math.random() * 5);
    
    const events = [];
    if (energy > 0.5) {
      events.push({
        id: `event-${hour}`,
        title: hour >= 17 ? 'Evening Floq' : 'Day Gathering',
        participants: Math.floor(energy * 8) + 2,
        vibe: hour >= 17 ? 'social' : 'chill'
      });
    }

    return {
      hour,
      energy,
      participants: baseParticipants,
      events,
      predictions: isFuture
    };
  }, [currentHour]);

  const handleTimeChange = useCallback((values: number[]) => {
    const newHour = values[0];
    setSelectedHour(newHour);
    setIsRealTime(newHour === currentHour);
    
    const data = getTimeWarpData(newHour);
    onTimeChange?.(newHour, data);
    
    // Haptic feedback for time scrubbing
    socialHaptics.timeShift();
  }, [currentHour, getTimeWarpData, onTimeChange, socialHaptics]);

  const resetToRealTime = useCallback(() => {
    setSelectedHour(currentHour);
    setIsRealTime(true);
    const data = getTimeWarpData(currentHour);
    onTimeChange?.(currentHour, data);
    socialHaptics.gestureConfirm();
  }, [currentHour, getTimeWarpData, onTimeChange, socialHaptics]);

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getTimeLabel = (hour: number) => {
    if (hour < currentHour) return 'Past';
    if (hour > currentHour) return 'Future';
    return 'Now';
  };

  const currentData = getTimeWarpData(selectedHour);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-end">
      <div className="w-full bg-card/95 backdrop-blur-xl rounded-t-3xl border-t border-border p-6 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Time Warp</h2>
            <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
              {getTimeLabel(selectedHour)}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Time Display */}
        <div className="text-center mb-6">
          <div className="text-3xl font-light text-primary mb-1">
            {formatTime(selectedHour)}
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedHour < currentHour && `${currentHour - selectedHour} hours ago`}
            {selectedHour > currentHour && `${selectedHour - currentHour} hours from now`}
            {selectedHour === currentHour && 'Right now'}
          </div>
        </div>

        {/* Time Slider */}
        <div className="mb-6">
          <Slider
            value={[selectedHour]}
            onValueChange={handleTimeChange}
            max={23}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </div>

        {/* Energy Visualization */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Social Energy</span>
            <span className="text-sm font-medium text-primary">
              {Math.round(currentData.energy * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${currentData.energy * 100}%` }}
            />
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-muted/50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">
              {currentData.predictions ? 'Predicted Activity' : 'Historical Activity'}
            </span>
            <span className="text-lg font-semibold text-primary">
              {currentData.participants} people
            </span>
          </div>
          
          {currentData.events.length > 0 && (
            <div className="space-y-2">
              {currentData.events.map((event) => (
                <div key={event.id} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {event.participants} joined
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1 flex items-center justify-center space-x-2"
            onClick={() => handleTimeChange([Math.max(0, selectedHour - 1)])}
            disabled={selectedHour === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Earlier</span>
          </Button>
          
          <Button 
            variant={isRealTime ? "default" : "secondary"}
            className="flex-1 flex items-center justify-center space-x-2"
            onClick={resetToRealTime}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Now</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex-1 flex items-center justify-center space-x-2"
            onClick={() => handleTimeChange([Math.min(23, selectedHour + 1)])}
            disabled={selectedHour === 23}
          >
            <span>Later</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};