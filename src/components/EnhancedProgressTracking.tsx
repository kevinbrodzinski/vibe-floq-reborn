import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProgressMetrics {
  timeProgress: number;
  stopsCompleted: number;
  totalStops: number;
  participantsCheckedIn: number;
  totalParticipants: number;
  estimatedTimeRemaining: number;
  currentStopIndex: number;
}

interface EnhancedProgressTrackingProps {
  plan: any;
  checkIns: any[];
  participants: any[];
  className?: string;
}

export function EnhancedProgressTracking({
  plan,
  checkIns,
  participants,
  className = ''
}: EnhancedProgressTrackingProps) {
  
  const metrics = useMemo<ProgressMetrics>(() => {
    const now = new Date();
    const startTime = new Date(plan.planned_at);
    const endTime = plan.end_at ? new Date(plan.end_at) : new Date(startTime.getTime() + 4 * 60 * 60 * 1000);
    
    // Time-based progress
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = Math.max(0, now.getTime() - startTime.getTime());
    const timeProgress = Math.min(100, (elapsed / totalDuration) * 100);
    
    // Stop completion progress
    const stops = plan.plan_stops || [];
    const stopsCompleted = stops.filter((stop: any) => {
      const stopCheckIns = checkIns.filter(ci => ci.stop_id === stop.id);
      const checkedInCount = stopCheckIns.length;
      const requiredThreshold = Math.ceil(participants.length * 0.5); // 50% threshold
      return checkedInCount >= requiredThreshold;
    }).length;
    
    // Current stop determination
    const currentStopIndex = Math.min(stopsCompleted, stops.length - 1);
    
    // Participant check-in status for current stop
    const currentStop = stops[currentStopIndex];
    const currentStopCheckIns = currentStop ? 
      checkIns.filter(ci => ci.stop_id === currentStop.id && !ci.checked_out_at) : [];
    
    // Time estimation based on actual progress
    const averageTimePerStop = elapsed / Math.max(1, stopsCompleted);
    const remainingStops = Math.max(0, stops.length - stopsCompleted);
    const estimatedTimeRemaining = remainingStops * averageTimePerStop;
    
    return {
      timeProgress,
      stopsCompleted,
      totalStops: stops.length,
      participantsCheckedIn: currentStopCheckIns.length,
      totalParticipants: participants.length,
      estimatedTimeRemaining,
      currentStopIndex
    };
  }, [plan, checkIns, participants]);

  const completionPercentage = metrics.totalStops > 0 ? 
    (metrics.stopsCompleted / metrics.totalStops) * 100 : 0;

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Plan Progress</h3>
          <Badge variant="outline">
            {metrics.stopsCompleted}/{metrics.totalStops} stops
          </Badge>
        </div>
        
        <Progress 
          value={completionPercentage} 
          className="h-2"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(completionPercentage)}% complete</span>
          <span>~{formatTimeRemaining(metrics.estimatedTimeRemaining)} remaining</span>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
          whileHover={{ scale: 1.02 }}
        >
          <Clock className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <div className="font-medium">{Math.round(metrics.timeProgress)}%</div>
            <div className="text-muted-foreground">Time elapsed</div>
          </div>
        </motion.div>

        <motion.div 
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
          whileHover={{ scale: 1.02 }}
        >
          <MapPin className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <div className="font-medium">{metrics.stopsCompleted}</div>
            <div className="text-muted-foreground">Stops completed</div>
          </div>
        </motion.div>

        <motion.div 
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
          whileHover={{ scale: 1.02 }}
        >
          <Users className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <div className="font-medium">
              {metrics.participantsCheckedIn}/{metrics.totalParticipants}
            </div>
            <div className="text-muted-foreground">Checked in</div>
          </div>
        </motion.div>

        <motion.div 
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
          whileHover={{ scale: 1.02 }}
        >
          <CheckCircle className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <div className="font-medium">
              {Math.round((metrics.participantsCheckedIn / metrics.totalParticipants) * 100)}%
            </div>
            <div className="text-muted-foreground">Group sync</div>
          </div>
        </motion.div>
      </div>

      {/* Auto-advance indicator */}
      {metrics.participantsCheckedIn >= Math.ceil(metrics.totalParticipants * 0.75) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Ready to advance!</span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            75% of participants are checked in
          </p>
        </motion.div>
      )}
    </div>
  );
}