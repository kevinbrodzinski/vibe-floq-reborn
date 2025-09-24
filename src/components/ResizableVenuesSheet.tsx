import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp, ChevronDown, X, MapPin, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

type SheetSize = "collapsed" | "half" | "full";
const SHEET_HEIGHTS: Record<SheetSize, string> = {
  collapsed: "120px",
  half: "50vh",
  full: "90vh",
};

export const ResizableVenuesSheet: React.FC<ResizableVenuesSheetProps> = ({
  isOpen,
  onClose,
  onVenueTap,
  venues = [],
  className = "",
}) => {
  const [sheetSize, setSheetSize] = useState<SheetSize>("half");
  const constraintsRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /* 🎯 NEW – clamp & snap helpers                                      */
  /* ------------------------------------------------------------------ */
  const SIZES: SheetSize[] = ["collapsed", "half", "full"];
  const sizeToIndex = (s: SheetSize) => SIZES.indexOf(s);

  const snapToClosest = (deltaY: number) => {
    // positive = pulled down, negative = pushed up
    const current = sizeToIndex(sheetSize);
    const next =
      deltaY > 80
        ? Math.max(current - 1, 0) // down → smaller sheet
        : deltaY < -80
        ? Math.min(current + 1, 2) // up   → larger sheet
        : current;
    setSheetSize(SIZES[next]);
  };
  /* ------------------------------------------------------------------ */

  const handleDragEnd = useCallback(
    (_e: any, info: PanInfo) => snapToClosest(info.offset.y),
    [sheetSize]
  );

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="venue-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/50"
          />

          {/* Sheet container for drag constraints */}
          <div
            ref={constraintsRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
          >
            {/* Sheet */}
            <motion.div
              key="venue-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              drag="y"
              dragConstraints={constraintsRef}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              /* 🎯 NEW – live clamp while dragging */
              onDrag={(e, info) => {
                if (!constraintsRef.current) return;
                const minY = 0; // can’t drag above top of container
                const maxY =
                  constraintsRef.current.getBoundingClientRect().height -
                  parseFloat(SHEET_HEIGHTS["collapsed"]);
                const nextY = info.point.y;
                if (nextY < minY) info.point.y = minY;
                if (nextY > maxY) info.point.y = maxY;
              }}
              className={`fixed bottom-0 left-0 right-0 pointer-events-auto bg-card
                         rounded-t-2xl border-t border-border shadow-2xl ${className}`}
              style={{ height: SHEET_HEIGHTS[sheetSize] }}
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
                    onClick={() =>
                      setSheetSize(sheetSize === "full" ? "half" : "full")
                    }
                  >
                    {sheetSize === "full" ? <ChevronDown /> : <ChevronUp />}
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
                    {venues.map((v) => (
                      <Card
                        key={v.id}
                        onClick={() => onVenueTap(v.id)}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
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
                              {v.currentEvents && v.currentEvents > 0 && (
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
    </AnimatePresence>
  );
};