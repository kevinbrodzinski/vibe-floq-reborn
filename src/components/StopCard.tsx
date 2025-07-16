import { Clock, MapPin, Users, Trash2, Edit, Vote } from "lucide-react";
import { VotePanel } from "./VotePanel";

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'hsl(120 70% 60%)';
      case 'voted': return 'hsl(60 70% 60%)';
      case 'suggested': return 'hsl(280 70% 60%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

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
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-semibold text-foreground">{stop.title}</h4>
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStatusColor(stop.status) }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">{stop.description}</p>
          
          <div className="flex items-center space-x-4 text-xs text-accent">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{stop.location}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{stop.startTime} - {stop.endTime}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{stop.participants.length} going</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-right text-sm">
            <div className="text-primary font-medium">{stop.vibeMatch}% match</div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded-full hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
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