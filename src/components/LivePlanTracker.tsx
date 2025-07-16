import { useState, useEffect } from "react";
import { Clock, MapPin, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTime, formatTimeRange } from "@/lib/timeUtils";
import { CheckInButton } from "./CheckInButton";

interface PlanStop {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  address?: string;
  stop_order: number;
}

interface LivePlanTrackerProps {
  planId: string;
  stops: PlanStop[];
  currentStopIndex?: number;
  participants: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    checked_in_at?: string;
  }>;
  onStopAdvance?: (nextStopIndex: number) => void;
  className?: string;
}

export const LivePlanTracker = ({
  planId,
  stops,
  currentStopIndex = 0,
  participants,
  onStopAdvance,
  className = ""
}: LivePlanTrackerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const currentStop = stops[currentStopIndex];
  const nextStop = stops[currentStopIndex + 1];
  const isLastStop = currentStopIndex === stops.length - 1;
  
  const checkedInParticipants = participants.filter(p => p.checked_in_at);
  const checkedInCount = checkedInParticipants.length;
  const totalCount = participants.length;

  // Calculate time remaining and progress
  useEffect(() => {
    if (!currentStop?.end_time) return;

    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(currentStop.end_time!);
      const startTime = new Date(currentStop.start_time || currentStop.end_time!);
      
      const totalDuration = endTime.getTime() - startTime.getTime();
      const elapsed = now.getTime() - startTime.getTime();
      const remaining = Math.max(0, endTime.getTime() - now.getTime());
      
      // Calculate progress (0-100)
      const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      setProgress(progressPercent);
      
      // Format time remaining
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      if (remaining <= 0) {
        setTimeRemaining("Time's up!");
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentStop]);

  const handleAdvanceToNext = () => {
    if (!isLastStop && onStopAdvance) {
      onStopAdvance(currentStopIndex + 1);
    }
  };

  if (!currentStop) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">No active stops</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Stop Header */}
      <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {currentStopIndex + 1}
              </div>
              <h2 className="text-lg font-semibold">Now: {currentStop.title}</h2>
            </div>
            
            {currentStop.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {currentStop.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {currentStop.start_time && currentStop.end_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeRange(currentStop.start_time, currentStop.end_time)}</span>
                </div>
              )}
              
              {currentStop.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{currentStop.address}</span>
                </div>
              )}
            </div>
          </div>
          
          <CheckInButton
            planId={planId}
            stopId={currentStop.id}
            variant="default"
            size="sm"
          />
        </div>

        {/* Progress Bar */}
        {currentStop.end_time && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Time Progress</span>
              <span className="font-medium">{timeRemaining}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </Card>

      {/* Check-in Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Who's Here ({checkedInCount}/{totalCount})
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-muted-foreground">Checked in</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {participants.map((participant) => {
            const isCheckedIn = !!participant.checked_in_at;
            
            return (
              <div
                key={participant.id}
                className={`
                  flex items-center gap-2 px-2 py-1 rounded-full text-xs
                  ${isCheckedIn 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                <Avatar className="w-4 h-4">
                  <AvatarImage src={participant.avatar_url} />
                  <AvatarFallback className="text-[8px]">
                    {participant.display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{participant.display_name}</span>
                {isCheckedIn && <CheckCircle className="w-3 h-3" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Next Stop Preview */}
      {nextStop && (
        <Card className="p-4 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-muted-foreground text-xs">
                  {currentStopIndex + 2}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Next: {nextStop.title}
                </span>
              </div>
              
              {nextStop.start_time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-7">
                  <Clock className="w-3 h-3" />
                  <span>Starts at {formatTime(nextStop.start_time)}</span>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdvanceToNext}
              className="flex items-center gap-1"
            >
              <span>Move to Next</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      )}

      {/* Plan Complete */}
      {isLastStop && progress >= 90 && (
        <Card className="p-4 border-green-200 bg-green-50/50">
          <div className="text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-medium text-green-800 mb-1">Plan Nearly Complete!</h3>
            <p className="text-sm text-green-600">
              You're at the final stop. Ready to capture some afterglow moments?
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};