import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePlanVote } from "@/hooks/usePlanVote";
import { useToast } from "@/hooks/use-toast";

interface EmojiVoteBarProps {
  planId: string;
  stopId: string;
  currentVote?: string;
  onVoteChange?: (voteType: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const voteOptions = [
  { type: 'love', emoji: '❤️', label: 'Love it' },
  { type: 'like', emoji: '👍', label: 'Like it' },
  { type: 'neutral', emoji: '😐', label: 'Neutral' },
  { type: 'dislike', emoji: '👎', label: 'Dislike' },
  { type: 'veto', emoji: '❌', label: 'Veto' }
];

export const EmojiVoteBar = ({
  planId,
  stopId,
  currentVote,
  onVoteChange,
  className = "",
  size = "md"
}: EmojiVoteBarProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const { mutate: submitVote } = usePlanVote();
  const { toast } = useToast();

  const handleVote = async (voteType: string) => {
    if (isVoting || currentVote === voteType) return;

    setIsVoting(true);
    
    submitVote({
      plan_id: planId,
      stop_id: stopId,
      vote_type: voteType as any,
      emoji_reaction: voteOptions.find(v => v.type === voteType)?.emoji
    }, {
      onSuccess: () => {
        onVoteChange?.(voteType);
        toast({
          title: "Vote recorded",
          description: `Your ${voteType} vote has been saved`,
          duration: 2000,
        });
      },
      onError: (error) => {
        console.error('Vote error:', error);
        toast({
          variant: "destructive",
          title: "Failed to vote",
          description: "Please try again"
        });
      },
      onSettled: () => {
        setIsVoting(false);
      }
    });
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'text-sm gap-1';
      case 'lg': return 'text-lg gap-3';
      default: return 'text-base gap-2';
    }
  };

  const getButtonSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-6 h-6 text-xs';
      case 'lg': return 'w-10 h-10 text-lg';
      default: return 'w-8 h-8 text-sm';
    }
  };

  return (
    <div className={`flex items-center ${getSizeClasses()} ${className}`}>
      {voteOptions.map((option) => {
        const isSelected = currentVote === option.type;
        const isVeto = option.type === 'veto';
        
        return (
          <Button
            key={option.type}
            variant={isSelected ? "default" : "ghost"}
            size="sm"
            onClick={() => handleVote(option.type)}
            disabled={isVoting}
            className={`
              ${getButtonSizeClasses()}
              relative group
              ${isSelected ? 
                (isVeto ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90') 
                : 'hover:bg-accent'
              }
              ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}
              transition-all duration-200
              ${isSelected ? 'scale-110 shadow-md' : 'hover:scale-105'}
            `}
            title={option.label}
          >
            <span className={isSelected ? 'animate-pulse' : ''}>
              {option.emoji}
            </span>
            
            {/* Tooltip on hover */}
            <div className="
              absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
              bg-popover text-popover-foreground px-2 py-1 rounded text-xs
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              pointer-events-none whitespace-nowrap z-10
              border border-border shadow-sm
            ">
              {option.label}
            </div>
          </Button>
        );
      })}
      
      {/* Loading indicator */}
      {isVoting && (
        <div className="ml-2 w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
      )}
    </div>
  );
};