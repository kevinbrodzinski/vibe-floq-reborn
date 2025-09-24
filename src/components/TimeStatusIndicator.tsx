import { useTimeSyncContext } from './TimeSyncProvider';
import { Clock, Sunrise, Sun, CloudSun, Sunset, Moon, MoonIcon } from 'lucide-react';

export const TimeStatusIndicator = () => {
  const { timeState, getTimeMessage, getTimeEmoji, progress, isTransitioning } = useTimeSyncContext();

  const getTimeIcon = () => {
    const iconClass = "w-4 h-4";
    switch (timeState) {
      case 'dawn': return <Sunrise className={iconClass} />;
      case 'morning': return <Sun className={iconClass} />;
      case 'afternoon': return <CloudSun className={iconClass} />;
      case 'evening': return <Sunset className={iconClass} />;
      case 'night': return <Moon className={iconClass} />;
      case 'late': return <MoonIcon className={iconClass} />;
      default: return <Clock className={iconClass} />;
    }
  };

  return (
    <div className={`flex items-center space-x-2 transition-smooth ${isTransitioning ? 'animate-pulse' : ''}`}>
      <div className="flex items-center space-x-1">
        {getTimeIcon()}
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {timeState}
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-xs text-primary font-medium">
          {getTimeMessage()}
        </span>
        <span className="text-sm">{getTimeEmoji()}</span>
      </div>
      
      {/* Progress indicator */}
      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};