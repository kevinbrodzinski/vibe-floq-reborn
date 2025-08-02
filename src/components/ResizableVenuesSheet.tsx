import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronUp, ChevronDown, X, MapPin, Clock, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export const ResizableVenuesSheet: React.FC<ResizableVenuesSheetProps> = ({
  isOpen,
  onClose,
  onVenueTap,
  venues = [],
  className = '',
}) => {
  const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'full'>(
    'half'
  );

  const constraintsRef = useRef<HTMLDivElement>(null);

  /* --------------------------- Drag-to-resize logic --------------------------- */

  const handleDragEnd = useCallback((_e: unknown, info: PanInfo) => {
    const { offset } = info;

    if (offset.y > 100) {
      setSheetState('collapsed');
    } else if (offset.y < -100) {
      setSheetState('full');
    } else {
      setSheetState('half');
    }
  }, []);

  const sheetInlineStyle: React.CSSProperties = (() => {
    switch (sheetState) {
      case 'collapsed':
        return { height: '120px' };
      case 'half':
        return { height: '50vh' };
      case 'full':
        return { height: '90vh' };
      default:
        return { height: '50vh' };
    }
  })();

  /* ------------------------------ ESC key close ------------------------------ */

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose();
  };

  /* ---------------------------- Body scroll lock ----------------------------- */

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /* -------------------------------------------------------------------------- */
  /* Render                                                                     */
  /* -------------------------------------------------------------------------- */

  return createPortal(
    <AnimatePresence initial={false}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="venue-backdrop"
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet wrapper (creates drag constraints) */}
          <div
            key="venue-wrapper"
            ref={constraintsRef}
            className="fixed inset-0 z-[80] outline-none"
            onKeyDown={onKeyDown}
          >
            {/* Actual sheet */}
            <motion.div
              key="venue-sheet"
              className={`fixed bottom-0 left-0 right-0 z-[80] pointer-events-auto
                         bg-card rounded-t-2xl border-t border-border shadow-2xl
                         ${className}`}
              style={sheetInlineStyle}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragConstraints={constraintsRef}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
            >
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full cursor-grab active:cursor-grabbing" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Venues</h2>
                  <Badge variant="secondary">{venues.length}</Badge>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSheetState(sheetState === 'full' ? 'half' : 'full')
                    }
                    aria-label="Toggle size"
                  >
                    {sheetState === 'full' ? <ChevronDown /> : <ChevronUp />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
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
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => onVenueTap(v.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium">{v.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {v.address}
                              </p>
                              {v.distance && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {v.distance} m away
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {!!v.currentEvents && (
                                <Badge variant="default" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {v.currentEvents}
                                </Badge>
                              )}
                              {v.nextEventTime && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
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
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};