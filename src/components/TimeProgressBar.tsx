import { Clock } from 'lucide-react';

interface TimeProgressBarProps {
  planStartTime: Date;
  planDuration: number; // in minutes
  className?: string;
}

export const TimeProgressBar = ({ 
  planStartTime, 
  planDuration, 
  className = "" 
}: TimeProgressBarProps) => {
  const now = new Date();
  const elapsed = Math.max(0, now.getTime() - planStartTime.getTime());
  const totalDuration = planDuration * 60 * 1000; // Convert to milliseconds
  const progress = Math.min(100, (elapsed / totalDuration) * 100);
  
  const remainingMinutes = Math.max(0, Math.floor((totalDuration - elapsed) / (60 * 1000)));
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  
  const formatTime = () => {
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Planning Progress</span>
        </div>
        <span>{formatTime()}</span>
      </div>
      
      <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
        <div 
          className="h-full bg-gradient-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="text-xs text-muted-foreground mt-1 text-center">
        {Math.round(progress)}% complete
      </div>
    </div>
  );
};