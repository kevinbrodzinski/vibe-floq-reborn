import { Vote } from "lucide-react";

interface PlanStop {
  id: string;
  votes: { userId: string; vote: 'yes' | 'no' | 'maybe' }[];
}

interface VotePanelProps {
  stop: PlanStop;
  onVote: (voteType: 'yes' | 'no' | 'maybe') => void;
  currentUserId: string;
  className?: string;
}

export const VotePanel = ({ stop, onVote, currentUserId, className = "" }: VotePanelProps) => {
  const getVoteCount = (voteType: 'yes' | 'no' | 'maybe') => {
    return stop.votes.filter(v => v.vote === voteType).length;
  };

  const getUserVote = () => {
    return stop.votes.find(v => v.userId === currentUserId)?.vote;
  };

  const voteOptions = [
    { type: 'yes' as const, emoji: '👍', color: 'text-green-400' },
    { type: 'maybe' as const, emoji: '🤷', color: 'text-yellow-400' },
    { type: 'no' as const, emoji: '👎', color: 'text-red-400' }
  ];

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Vote className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Votes:</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          {voteOptions.map((option) => (
            <span key={option.type} className={option.color}>
              {option.emoji} {getVoteCount(option.type)}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        {voteOptions.map((option) => (
          <button
            key={option.type}
            onClick={(e) => {
              e.stopPropagation();
              onVote(option.type);
            }}
            className={`
              px-3 py-1 rounded-full text-xs font-medium transition-all duration-300
              ${getUserVote() === option.type
                ? 'bg-primary text-primary-foreground glow-primary'
                : 'bg-secondary/40 text-secondary-foreground hover:bg-secondary/60'
              }
            `}
          >
            {option.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};