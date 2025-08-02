import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  X,
  MapPin,
  Clock,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Venue {
  id: string;
  name: string;
  address: string;
  distance?: number;
  currentEvents?: number;
  nextEventTime?: string;
  category?: string;
}

interface ResizableVenuesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueTap: (venueId: string) => void;
  venues?: Venue[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export const ResizableVenuesSheet: React.FC<ResizableVenuesSheetProps> = ({
  isOpen,
  onClose,
  onVenueTap,
  venues = [],
  className = '',
}) => {
  /* -------------------------------------------------------------- */
  /*  Height state & helpers                                         */
  /* -------------------------------------------------------------- */
  const [mode, setMode] = useState<'collapsed' | 'half' | 'full'>('half');
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_e: unknown, info: PanInfo) => {
    if (info.offset.y > 100) {
      setMode('collapsed');
    } else if (info.offset.y < -100) {
      setMode('full');
    } else {
      setMode('half');
    }
  }, []);

  const heightStyle = (() => {
    switch (mode) {
      case 'collapsed':
        return { height: 120 };
      case 'half':
        return { height: '50vh' };
      case 'full':
        return { height: '90vh' };
      default:
        return { height: '50vh' };
    }
  })();

  /* -------------------------------------------------------------- */
  /*  Side-effects                                                   */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /** Close on ESC */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose();
  };

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ───────────────────────── Backdrop ───────────────────── */}
          <motion.div
            {...zIndex('modal')}
            key="venue-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* ───────────────────────── Sheet container ────────────── */}
          <div
            ref={constraintsRef}
            className="fixed inset-0 pointer-events-none"
            onKeyDown={onKeyDown}
          >
            <motion.div
              key="venue-sheet"
              drag="y"
              dragConstraints={constraintsRef}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              {...zIndex('dmSheet')}
              className={`fixed bottom-0 left-0 right-0 pointer-events-auto bg-card rounded-t-2xl border-t border-border shadow-2xl ${className}`}
              style={heightStyle}
            >
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 rounded-full bg-muted-foreground/30 cursor-grab active:cursor-grabbing" />
              </div>

              {/* Header */}
              <header className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Venues</h2>
                  <Badge variant="secondary">{venues.length}</Badge>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode(mode === 'full' ? 'half' : 'full')}
                    aria-label={
                      mode === 'full' ? 'Collapse list' : 'Expand list'
                    }
                  >
                    {mode === 'full' ? <ChevronDown /> : <ChevronUp />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Close venues list"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {/* Content */}
              <section className="flex-1 overflow-y-auto px-4 pb-4">
                {venues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mb-2 opacity-50" />
                    <p>No venues nearby</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {venues.map((v) => (
                      <Card
                        key={v.id}
                        onClick={() => onVenueTap(v.id)}
                        className="cursor-pointer transition-colors hover:bg-accent/50"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium">{v.name}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {v.address}
                              </p>
                              {v.distance && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {v.distance} m away
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {v.currentEvents && v.currentEvents > 0 && (
                                <Badge variant="default" className="text-xs">
                                  <Users className="mr-1 h-3 w-3" />
                                  {v.currentEvents}
                                </Badge>
                              )}

                              {v.nextEventTime && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {v.nextEventTime}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};