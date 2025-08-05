import { Progress } from "@/components/ui/progress";
import { Users, Target, CheckCircle } from "lucide-react";

interface VotingThresholdMeterProps {
  totalParticipants: number;
  votedParticipants: number;
  threshold?: number; // Percentage threshold for quorum (default 60%)
  className?: string;
}

export const VotingThresholdMeter = ({
  totalParticipants,
  votedParticipants,
  threshold = 60,
  className = ""
}: VotingThresholdMeterProps) => {
  const participationRate = totalParticipants > 0 ? (votedParticipants / totalParticipants) * 100 : 0;
  const hasReachedQuorum = participationRate >= threshold;
  const remainingNeeded = Math.max(0, Math.ceil((threshold / 100) * totalParticipants) - votedParticipants);

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Voting Progress</span>
        </div>
        
        {hasReachedQuorum && (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs font-medium">Quorum Reached</span>
          </div>
        )}
      </div>

      <Progress 
        value={participationRate} 
        className="mb-3 h-2"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{votedParticipants}/{totalParticipants} voted</span>
        </div>
        
        <div className="text-right">
          {hasReachedQuorum ? (
            <span className="text-green-400 font-medium">
              {Math.round(participationRate)}% participation
            </span>
          ) : (
            <span>
              {remainingNeeded} more needed for {threshold}% quorum
            </span>
          )}
        </div>
      </div>
    </div>
  );
};