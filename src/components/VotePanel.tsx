import { Vote } from "lucide-react";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { usePlanVote } from "@/hooks/usePlanVote";
import { useSession } from "@supabase/auth-helpers-react";

interface VotePanelProps {
  planId: string;
  stopId: string;
  className?: string;
}

const voteOptions = [
  { type: 'love' as const, emoji: '❤️', color: 'text-red-400', label: 'Love' },
  { type: 'like' as const, emoji: '👍', color: 'text-green-400', label: 'Like' },
  { type: 'neutral' as const, emoji: '🤷', color: 'text-yellow-400', label: 'Neutral' },
  { type: 'dislike' as const, emoji: '👎', color: 'text-orange-400', label: 'Dislike' },
  { type: 'veto' as const, emoji: '❌', color: 'text-red-600', label: 'Veto' }
];

export const VotePanel = ({ planId, stopId, className = "" }: VotePanelProps) => {
  const session = useSession();
  const user = session?.user;
  const { mutate: submitVote, isPending } = usePlanVote();

  const handleVote = (voteType: typeof voteOptions[number]['type']) => {
    if (!user) return;
    
    submitVote({
      plan_id: planId,
      stop_id: stopId,
      vote_type: voteType,
      emoji_reaction: voteOptions.find(v => v.type === voteType)?.emoji
    });
  };

  const { selectedIndex, handleKeyDown } = useKeyboardNavigation({
    itemCount: voteOptions.length,
    onSelect: (index) => handleVote(voteOptions[index].type),
    loop: true
  });

  return (
    <div 
      className={`flex items-center justify-between ${className}`}
      role="group"
      aria-label="Vote on this stop"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Vote className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Votes:</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">Cast your vote</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-1" role="radiogroup" aria-label="Vote options">
        {voteOptions.map((option, index) => (
          <button
            key={option.type}
            onClick={(e) => {
              e.stopPropagation();
              handleVote(option.type);
            }}
            disabled={isPending}
            className={`
              px-3 py-1 rounded-full text-xs font-medium transition-all duration-300
              bg-secondary/40 text-secondary-foreground hover:bg-secondary/60
              disabled:opacity-50 disabled:cursor-not-allowed
              ${selectedIndex === index ? 'ring-2 ring-primary/50' : ''}
            `}
            role="radio"
            aria-label={`Vote ${option.label}`}
          >
            {option.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};