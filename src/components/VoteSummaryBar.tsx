import { Vote, Users, TrendingUp, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { safeVoteType } from '@/types/enums/voteType';

interface VoteData {
  love: number;
  like: number;
  neutral: number;
  dislike: number;
  veto: number;
}

interface VoteSummaryBarProps {
  stopId: string;
  votes: VoteData;
  totalParticipants: number;
  className?: string;
}

const voteConfig = [
  { type: 'love', emoji: '❤️', color: 'bg-red-400', label: 'Love' },
  { type: 'like', emoji: '👍', color: 'bg-green-400', label: 'Like' },
  { type: 'neutral', emoji: '🤷', color: 'bg-yellow-400', label: 'Neutral' },
  { type: 'dislike', emoji: '👎', color: 'bg-orange-400', label: 'Dislike' },
  { type: 'veto', emoji: '❌', color: 'bg-red-600', label: 'Veto' }
];

export const VoteSummaryBar = ({
  stopId,
  votes,
  totalParticipants,
  className = ""
}: VoteSummaryBarProps) => {
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const participationRate = totalParticipants > 0 ? (totalVotes / totalParticipants) * 100 : 0;
  
  const getConsensusLevel = () => {
    const positiveVotes = votes.love + votes.like;
    const negativeVotes = votes.dislike + votes.veto;
    
    if (votes.veto > 0) return { level: 'blocked', color: 'text-red-400' };
    if (positiveVotes > negativeVotes && participationRate >= 50) return { level: 'positive', color: 'text-green-400' };
    if (negativeVotes > positiveVotes) return { level: 'negative', color: 'text-orange-400' };
    return { level: 'mixed', color: 'text-yellow-400' };
  };

  const consensus = getConsensusLevel();

  return (
    <TooltipProvider>
      <div className={`bg-card border border-border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Vote Summary</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {totalVotes}/{totalParticipants} voted ({Math.round(participationRate)}%)
          </span>
        </div>
      </div>

      {/* Vote breakdown */}
      <div className="space-y-2 mb-3">
        {voteConfig.map((config) => {
          const count = votes[safeVoteType(config.type) as keyof VoteData];
          const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          
          return (
            <div key={config.type} className="flex items-center gap-2">
              <span className="text-xs w-6">{config.emoji}</span>
              <div className="flex-1 bg-secondary/20 rounded-full h-2 relative overflow-hidden">
                <div
                  className={`h-full ${config.color} transition-all duration-500 ease-out animate-scale-in`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Consensus indicator */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <TrendingUp className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Consensus:</span>
        <span className={`text-xs font-medium ${consensus.color}`}>
          {consensus.level.charAt(0).toUpperCase() + consensus.level.slice(1)}
        </span>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {votes.veto > 0 ? "Someone vetoed this stop" :
               consensus.level === 'positive' ? "More positive than negative votes with 50%+ participation" :
               consensus.level === 'negative' ? "More negative than positive votes" :
               "Mixed or insufficient votes"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  );
};