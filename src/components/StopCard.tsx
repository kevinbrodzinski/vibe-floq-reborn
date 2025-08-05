import { VotePanel } from "./VotePanel";
import { StopCardHeader } from "./StopCardHeader";
import { StopCardMeta } from "./StopCardMeta";
import { StopCardActions } from "./StopCardActions";
import { getGradientClasses } from "@/lib/utils/getGradientClasses";
import { StopKind, VibeTag } from "@/lib/theme/stopColours";
import { type PlanStop } from "@/types/plan";
import { cn } from "@/lib/utils";

interface StopCardProps {
  stop: PlanStop;
  isSelected?: boolean;
  isDragOver?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onVote?: (voteType: 'yes' | 'no' | 'maybe') => void;
  onDragStart?: (e: React.DragEvent) => void;
  draggable?: boolean;
  editable?: boolean;
  votingEnabled?: boolean;
  showActions?: boolean;
  className?: string;
}

export const StopCard = ({
  stop,
  isSelected = false,
  isDragOver = false,
  onSelect,
  onEdit,
  onRemove,
  onVote,
  onDragStart,
  draggable = true,
  editable = true,
  votingEnabled = true,
  showActions = true,
  className = ""
}: StopCardProps) => {
  const gradient = getGradientClasses(stop.kind, stop.vibe_tag);

  return (
    <div
      draggable={draggable && editable}
      onDragStart={editable ? onDragStart : undefined}
      onClick={onSelect}
      className={cn(
        "gradient-border p-4 backdrop-blur-xl bg-card/75 transition-all duration-300",
        gradient,
        editable && draggable && "cursor-grab hover:-translate-y-0.5",
        !editable && "opacity-60 cursor-default",
        isSelected && "ring-2 ring-primary -translate-y-1",
        isDragOver && "ring-2 ring-accent",
        className
      )}
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
        
        {showActions && editable && onRemove && (
          <StopCardActions
            vibeMatch={stop.vibeMatch}
            onRemove={onRemove}
          />
        )}
      </div>
      
      {/* Voting interface */}
      {isSelected && votingEnabled && editable && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <VotePanel
            planId={stop.plan_id || ""}
            stopId={stop.id}
          />
        </div>
      )}
      
      {/* Finalized indicator */}
      {!editable && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Finalized
        </div>
      )}
    </div>
  );
};