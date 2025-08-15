import React from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Clock, Move, AlertTriangle, MapPin } from 'lucide-react';
import { StopCard } from './StopCard';

export type TimelineStop = {
  id: string;
  title: string;
  venueName?: string;
  start: string;     // "18:30"
  end: string;       // "19:45"
  durationMin: number;
  color?: string;
  conflicts?: string[];  // ["overlap","closed","participant"]
  travel?: { fromPrevWalkMin?: number; fromPrevDriveMin?: number };
};

export function minutesSince(startHHmm: string, baseHHmm = '18:00') {
  const [bh, bm] = baseHHmm.split(':').map(Number);
  const [h, m] = startHHmm.split(':').map(Number);
  return (h * 60 + m) - (bh * 60 + bm);
}

function timeTicks(from = '18:00', to = '24:00', step = 30) {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  const out: string[] = [];
  for (let t = start; t <= end; t += step) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return out;
}

type Props = {
  stops: TimelineStop[];
  onReorder?: (next: TimelineStop[]) => void;
  onAddAt?: (hhmm: string) => void;
  startHHmm?: string; // grid start
  endHHmm?: string;   // grid end
  className?: string;
};

export const TimelineCanvas: React.FC<Props> = ({
  stops,
  onReorder,
  onAddAt,
  startHHmm = '18:00',
  endHHmm = '23:30',
  className = ''
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex(s => s.id === active.id);
    const newIndex = stops.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder?.(arrayMove(stops, oldIndex, newIndex));
  };

  const ticks = timeTicks(startHHmm, endHHmm, 30);

  return (
    <div className={`rounded-2xl bg-card/90 backdrop-blur-xl border border-border/30 p-3 sm:p-4 ${className}`}>
      {/* ruler */}
      <div className="relative">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0,1fr))` }}>
          {ticks.map(t => (
            <div key={t} className="px-1">
              <div className="h-8 text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t}
              </div>
              <div className="h-[1px] bg-border/30" />
            </div>
          ))}
        </div>

        {/* droppable rail */}
        <div className="relative mt-2">
          {/* Ghost add zones */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0,1fr))` }}>
            {ticks.map(t => (
              <button
                key={`add-${t}`}
                onClick={() => onAddAt?.(t)}
                className="h-10 rounded-xl border border-transparent hover:border-border/30 hover:bg-muted/20 transition-all duration-200 group flex items-center justify-center"
                aria-label={`Add stop at ${t}`}
              >
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  +
                </span>
              </button>
            ))}
          </div>

          {/* Stops lane (sortable vertically for simplicity; visual layout uses absolute %) */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="relative h-[220px]">
                {stops.map((s) => {
                  const gridMin = minutesSince(startHHmm, startHHmm); // 0
                  const startMin = minutesSince(s.start, startHHmm) - gridMin;
                  const leftPct = Math.max(0, (startMin / (minutesSince(endHHmm, startHHmm))) * 100);
                  const widthPct = Math.max(14, (s.durationMin / (minutesSince(endHHmm, startHHmm))) * 100);

                  return (
                    <motion.div
                      key={s.id}
                      className="absolute top-4"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      initial={{ opacity: 0.6, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <StopCard
                        id={s.id}
                        title={s.title}
                        subtitle={s.venueName}
                        durationMin={s.durationMin}
                        color={s.color}
                        conflicts={s.conflicts}
                        travel={s.travel}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Legend / hints */}
      <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
        <Move className="h-3.5 w-3.5" /> Drag to reorder
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <AlertTriangle className="h-3.5 w-3.5" /> Conflicts show on cards
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <MapPin className="h-3.5 w-3.5" /> Gap buttons add a stop at that time
      </div>
    </div>
  );
};