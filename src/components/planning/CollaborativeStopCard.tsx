import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  AlertTriangle, 
  User, 
  Car, 
  Clock, 
  MapPin,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StopVoting } from './StopVoting';
import { StopComments } from './StopComments';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { PlanStop } from '@/types/plan';

interface CollaborativeStopCardProps {
  stop: PlanStop;
  planId: string;
  index: number;
  onEdit?: (stop: PlanStop) => void;
  onDelete?: (stopId: string) => void;
  onVoteChange?: (stopId: string, upVotes: number, downVotes: number) => void;
  className?: string;
  isDragging?: boolean;
}

export function CollaborativeStopCard({ 
  stop, 
  planId, 
  index, 
  onEdit, 
  onDelete,
  onVoteChange,
  className,
  isDragging = false
}: CollaborativeStopCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || sortableIsDragging;

  // Calculate stop status based on voting (if implemented)
  const getStopStatus = () => {
    if (stop.status === 'confirmed') return { color: 'bg-green-500/20 text-green-400', label: 'Confirmed' };
    if (stop.status === 'pending') return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' };
    if (stop.status === 'cancelled') return { color: 'bg-red-500/20 text-red-400', label: 'Cancelled' };
    return { color: 'bg-blue-500/20 text-blue-400', label: 'Draft' };
  };

  const stopStatus = getStopStatus();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative bg-white/5 backdrop-blur-xl border-white/10 text-white transition-all duration-200",
        isCurrentlyDragging && "opacity-50 scale-95 shadow-2xl z-50",
        !isCurrentlyDragging && "hover:bg-white/10 hover:border-white/20",
        className
      )}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing transition-colors mt-1"
          >
            <GripVertical className="w-4 h-4 text-white/40" />
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title & Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{stop.title}</h3>
                {stop.description && (
                  <p className="text-sm text-white/70 mt-1 line-clamp-2">{stop.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={cn("text-xs", stopStatus.color)}>
                  {stopStatus.label}
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white/60 hover:bg-white/10 h-6 w-6 p-0"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex items-center gap-4 text-sm text-white/60">
              {stop.start_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{format(parseISO(stop.start_time), 'h:mm a')}</span>
                </div>
              )}
              
              {stop.duration_minutes && (
                <span>{stop.duration_minutes}min</span>
              )}

              {stop.venue && (
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{stop.venue}</span>
                </div>
              )}

              {stop.estimated_cost_per_person && (
                <span>${stop.estimated_cost_per_person}/person</span>
              )}
            </div>
          </div>
        </div>

        {/* Voting Section */}
        <StopVoting 
          stopId={stop.id} 
          planId={planId} 
          onVoteChange={onVoteChange}
        />

        {/* Expanded Content */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            {/* Travel Time Indicators */}
            {index > 0 && (
              <div className="flex items-center gap-4 text-xs text-white/50 bg-white/5 rounded-lg p-2">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>5min walk</span>
                </div>
                <div className="flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  <span>2min drive</span>
                </div>
              </div>
            )}

            {/* Conflicts/Warnings */}
            {stop.status === 'pending' && (
              <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-2">
                <AlertTriangle className="w-3 h-3" />
                <span>Waiting for group consensus</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-white/60 hover:bg-white/10 h-7 px-2"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Comments
                </Button>
              </div>

              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(stop)}
                    className="text-white/60 hover:bg-white/10 h-7 px-2"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                )}
                
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(stop.id)}
                    className="text-white/60 hover:bg-red-500/20 hover:text-red-400 h-7 px-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <Collapsible open={showComments} onOpenChange={setShowComments}>
              <CollapsibleContent>
                <div className="border-t border-white/10 pt-4">
                  <StopComments 
                    stopId={stop.id} 
                    planId={planId}
                    maxHeight="200px"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}