
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronUp, ChevronDown, X, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

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

export const ResizableVenuesSheet: React.FC<ResizableVenuesSheetProps> = ({
  isOpen,
  onClose,
  onVenueTap,
  venues = [],
  className = ""
}) => {
  const [sheetHeight, setSheetHeight] = useState<'collapsed' | 'half' | 'full'>('half');
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const { offset } = info;
    if (offset.y > 100) {
      setSheetHeight('collapsed');
    } else if (offset.y < -100) {
      setSheetHeight('full');
    } else {
      setSheetHeight('half');
    }
  }, []);

  const getSheetStyle = () => {
    switch (sheetHeight) {
      case 'collapsed':
        return { height: '120px' };
      case 'half':
        return { height: '50vh' };
      case 'full':
        return { height: '90vh' };
      default:
        return { height: '50vh' };
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        {...zIndex('modal')}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          drag="y"
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          {...zIndex('toast')}
          className={`fixed bottom-0 left-0 right-0 pointer-events-auto
                     bg-card rounded-t-2xl border-t border-border shadow-2xl ${className}`}
          style={getSheetStyle()}
        >
          {/* Handle */}
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
                onClick={() => setSheetHeight(sheetHeight === 'full' ? 'half' : 'full')}
              >
                {sheetHeight === 'full' ? <ChevronDown /> : <ChevronUp />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
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
                {venues.map((venue) => (
                  <Card 
                    key={venue.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onVenueTap(venue.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{venue.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {venue.address}
                          </p>
                          {venue.distance && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {venue.distance}m away
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {venue.currentEvents && venue.currentEvents > 0 && (
                            <Badge variant="default" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {venue.currentEvents}
                            </Badge>
                          )}
                          {venue.nextEventTime && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {venue.nextEventTime}
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
  );
};
