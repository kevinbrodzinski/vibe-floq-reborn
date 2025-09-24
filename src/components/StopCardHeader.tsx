import { Clock, MapPin, Users } from "lucide-react";
import { formatTimeRange } from "@/lib/timeUtils";

interface StopCardHeaderProps {
  title: string;
  status: string;
  color: string;
}

export const StopCardHeader = ({ title, status, color }: StopCardHeaderProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'hsl(120 70% 60%)';
      case 'voted': return 'hsl(60 70% 60%)';
      case 'suggested': return 'hsl(280 70% 60%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  return (
    <div className="flex items-center space-x-2 mb-1">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <div 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: getStatusColor(status) }}
        aria-label={`Status: ${status}`}
      />
    </div>
  );
};