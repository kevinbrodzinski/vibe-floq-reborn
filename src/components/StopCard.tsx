import { VotePanel } from "./VotePanel";
import { StopCardHeader } from "./StopCardHeader";
import { StopCardMeta } from "./StopCardMeta";
import { StopCardActions } from "./StopCardActions";

interface PlanStop {
  id: string;
  title: string;
  venue: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  vibeMatch: number;
  participants: string[];
  status: 'confirmed' | 'suggested' | 'voted';
  votes: { userId: string; vote: 'yes' | 'no' | 'maybe' }[];
  createdBy: string;
  color: string;
}

interface StopCardProps {
  stop: PlanStop;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onVote: (voteType: 'yes' | 'no' | 'maybe') => void;
  onDragStart: (e: React.DragEvent) => void;
  className?: string;
}

export const StopCard = ({
  stop,
  isSelected,
  isDragOver,
  onSelect,
  onRemove,
  onVote,
  onDragStart,
  className = ""
}: StopCardProps) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`
        bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30 
        cursor-grab transition-all duration-300 hover:scale-[1.02] hover:glow-secondary
        ${isSelected ? 'ring-2 ring-primary glow-primary' : ''}
        ${isDragOver ? 'ring-2 ring-accent' : ''}
        ${className}
      `}
      style={{ borderLeftColor: stop.color, borderLeftWidth: '4px' }}
      role="listitem"
      aria-label={`Stop: ${stop.title}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <StopCardHeader 
            title={stop.title}
            status={stop.status}
            color={stop.color}
          />
          
          <StopCardMeta
            location={stop.location}
            startTime={stop.startTime}
            endTime={stop.endTime}
            participantCount={stop.participants.length}
            description={stop.description}
          />
        </div>
        
        <StopCardActions
          vibeMatch={stop.vibeMatch}
          onRemove={onRemove}
        />
      </div>
      
      {/* Voting interface */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <VotePanel
            stop={stop}
            onVote={onVote}
            currentUserId="you"
          />
        </div>
      )}
    </div>
  );
};