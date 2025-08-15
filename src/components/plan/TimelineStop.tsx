import React from 'react';
import type { PlanStop } from '@/types/plan';
import { Clock, MapPin, GripVertical, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TimelineStop({
  stop, onEdit, onDelete, onDragStart, className, variant='darkGlass'
}: {
  stop: PlanStop;
  onEdit?: (s: PlanStop)=>void;
  onDelete?: (s: PlanStop)=>void;
  onDragStart?: (s: PlanStop)=>void;
  className?: string;
  variant?: 'darkGlass'|'lightGlass'|'neumorph';
}) {
  const theme = {
    darkGlass: 'bg-white/6 border-white/12',
    lightGlass: 'bg-white/90 border-black/10 text-black',
    neumorph: 'bg-[#0f1320] shadow-[8px_8px_16px_#0b0e19,-8px_-8px_16px_#13182a] border-white/5',
  }[variant];

  // Safely extract time values
  const startTime = (stop as any).start_time || (stop as any).startTime || '18:00';
  const endTime = (stop as any).end_time || (stop as any).endTime || '19:00';
  const venueName = (stop as any).venue_name || (stop as any).venue || stop.title;
  const address = (stop as any).address || (stop as any).location || '';
  const participants = (stop as any).participants || [];

  return (
    <div className={cn('group rounded-2xl border backdrop-blur-xl p-3 sm:p-4 transition w-full', theme, className)}>
      <div className="flex items-start gap-3">
        <button
          className="mt-1 hidden sm:block opacity-40 hover:opacity-100 transition"
          onMouseDown={() => onDragStart?.(stop)}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs opacity-70">
            <Clock className="h-3.5 w-3.5" />
            <span>{startTime} — {endTime}</span>
          </div>
          <div className="mt-1 text-base font-semibold truncate">{stop.title || venueName}</div>
          <div className="mt-1 text-xs opacity-80 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{venueName || address || 'TBD'}</span>
          </div>

          {!!(participants?.length) && (
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 opacity-70"/>
              <div className="flex -space-x-2">
                {participants.slice(0,5).map((p: any, i: number) => (
                  <img key={p.id || i} src={p.avatar_url || '/placeholder/avatar.png'}
                       className="h-6 w-6 rounded-full ring-2 ring-background object-cover"/>
                ))}
              </div>
              {participants.length > 5 && (
                <span className="text-xs opacity-60">+{participants.length-5}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onEdit?.(stop)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/12 hover:bg-white/18 transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete?.(stop)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-red-300 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}