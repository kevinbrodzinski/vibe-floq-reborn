import { VotePanel } from "./VotePanel";
import { StopCardHeader } from "./StopCardHeader";
import { StopCardMeta } from "./StopCardMeta";
import { StopCardActions } from "./StopCardActions";
import { getGradientClasses } from "@/lib/utils/getGradientClasses";
import { StopKind, VibeTag } from "@/lib/theme/stopColours";

interface PlanStop {
  id: string;
  plan_id?: string;
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
  kind: StopKind;
  vibe_tag?: VibeTag;
}

interface StopCardProps {
  stop: PlanStop;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onRemove: () => void;
  onVote: (voteType: 'yes' | 'no' | 'maybe') => void;
  onDragStart: (e: React.DragEvent) => void;
  draggable?: boolean;
  className?: string;
}

export const StopCard = ({
  stop,
  isSelected,
  isDragOver,
  onSelect,
  onEdit,
  onRemove,
  onVote,
  onDragStart,
  draggable = true,
  className = ""
}: StopCardProps) => {
  const gradient = getGradientClasses(stop.kind, stop.vibe_tag);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`
        gradient-border ${gradient} p-4 backdrop-blur-xl bg-card/75 
        cursor-grab transition-all duration-300 hover:-translate-y-0.5
        ${isSelected ? 'ring-2 ring-primary -translate-y-1' : ''}
        ${isDragOver ? 'ring-2 ring-accent' : ''}
        ${className}
      `}
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
            planId={stop.plan_id || ""}
            stopId={stop.id}
          />
        </div>
      )}
    </div>
  );
};