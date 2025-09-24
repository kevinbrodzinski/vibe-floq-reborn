
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Clock, MapPin, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface Stop {
  id: string;
  title: string;
  location: string;
  time: string;
  duration?: string;
  type?: 'venue' | 'activity' | 'transport';
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface DraggableStopCardProps {
  stop: Stop;
  onEdit?: (stop: Stop) => void;
  onDelete?: (stopId: string) => void;
  isSelected?: boolean;
  onSelect?: (stopId: string) => void;
  className?: string;
}

export const DraggableStopCard: React.FC<DraggableStopCardProps> = ({
  stop,
  onEdit,
  onDelete,
  isSelected = false,
  onSelect,
  className = ""
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging && zIndex('modal').style), // Apply modal z-index when dragging
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'tentative': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      layout
      className={`
        ${className}
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-primary' : ''}
      `}
    >
      <Card 
        className={`
          hover:shadow-md transition-shadow cursor-pointer
          ${isSelected ? 'border-primary' : ''}
        `}
        onClick={() => onSelect?.(stop.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <button
              {...listeners}
              className="mt-1 text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {stop.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{stop.location}</span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(stop.id);
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{stop.time}</span>
                  {stop.duration && (
                    <span className="text-xs">({stop.duration})</span>
                  )}
                </div>

                {stop.status && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0 ${getStatusColor(stop.status)}`}
                  >
                    {stop.status}
                  </Badge>
                )}

                {stop.type && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {stop.type}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
