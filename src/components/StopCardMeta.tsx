import { Clock, MapPin, Users } from "lucide-react";
import { formatTimeRange } from "@/lib/timeUtils";

interface StopCardMetaProps {
  location: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  description?: string;
}

export const StopCardMeta = ({ 
  location, 
  startTime, 
  endTime, 
  participantCount,
  description 
}: StopCardMetaProps) => {
  return (
    <>
      {description && (
        <p className="text-sm text-muted-foreground mb-2">
          {description}
        </p>
      )}
      
      <div className="flex items-center space-x-4 text-xs text-accent">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>{location || "Location TBD"}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{formatTimeRange(startTime, endTime)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Users className="w-3 h-3" />
          <span>{participantCount} going</span>
        </div>
      </div>
    </>
  );
};