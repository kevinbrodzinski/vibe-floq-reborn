import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertTriangle, User, Car, Clock } from 'lucide-react';

export const StopCard: React.FC<{
  id: string;
  title: string;
  subtitle?: string;
  durationMin: number;
  color?: string;
  conflicts?: string[];
  travel?: { fromPrevWalkMin?: number; fromPrevDriveMin?: number };
}> = ({ id, title, subtitle, durationMin, color = 'from-indigo-500 to-violet-500', conflicts = [], travel }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}
      className={`rounded-xl border bg-gradient-to-br ${color} text-white/95 
                  border-white/10 shadow-lg px-3 py-2 select-none ${isDragging ? 'opacity-80 z-50' : 'z-10'}`}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-white/10 transition-colors">
          <GripVertical className="h-4 w-4 text-white/80" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{title}</div>
          {!!subtitle && <div className="text-[11px] text-white/85 truncate">{subtitle}</div>}
        </div>
        <div className="ml-auto text-[11px] flex items-center gap-1 bg-black/20 rounded-md px-2 py-0.5 flex-shrink-0">
          <Clock className="h-3 w-3" /> {durationMin}m
        </div>
      </div>

      {(travel?.fromPrevWalkMin || travel?.fromPrevDriveMin || conflicts.length > 0) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] flex-wrap">
          {typeof travel?.fromPrevWalkMin === 'number' && (
            <span className="bg-black/30 rounded-md px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap">
              <User className="h-3 w-3" /> {travel.fromPrevWalkMin}m walk
            </span>
          )}
          {typeof travel?.fromPrevDriveMin === 'number' && (
            <span className="bg-black/30 rounded-md px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap">
              <Car className="h-3 w-3" /> {travel.fromPrevDriveMin}m drive
            </span>
          )}
          {conflicts.map((c) => (
            <span key={c} className="bg-amber-500/20 text-amber-200 rounded-md px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap">
              <AlertTriangle className="h-3 w-3" /> {c.replace('_',' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};