import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import SmartMap from '@/components/maps/SmartMap';
import { openDirections } from '@/lib/directions/handoff';
import { Coffee, Wine, MapPin, Clock, Users, Navigation } from 'lucide-react';
import type { HalfResult } from '@/hooks/useHQMeetHalfway';
import { useGroupPredictability } from '@/hooks/useGroupPredictability';
import { useRecommendationCapture } from '@/hooks/useRecommendationCapture';

interface MeetHalfwaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: HalfResult | undefined;
  selectedId: string | null;
  onSelectVenue: (id: string) => void;
  categories: string[];
  onToggleCategory: (category: string) => void;
  onRallyHere: () => void;
  loading?: boolean;
  rallyLoading?: boolean;
  memberDists?: number[][];
}

const CATEGORIES = [
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'bar', label: 'Bars', icon: Wine },
  { id: 'restaurant', label: 'Food', icon: MapPin },
] as const;

export default function MeetHalfwaySheet({
  open,
  onOpenChange,
  data,
  selectedId,
  onSelectVenue,
  categories,
  onToggleCategory,
  onRallyHere,
  loading = false,
  rallyLoading = false,
  memberDists = [],
}: MeetHalfwaySheetProps) {
  const selectedVenue = data?.candidates.find(c => c.id === selectedId);
  const gp = useGroupPredictability(memberDists);
  const blocked = !gp.ok;
  const capture = useRecommendationCapture('balanced');

  const handleNavigate = () => {
    if (!selectedVenue) return;
    openDirections({
      dest: { lat: selectedVenue.lat, lng: selectedVenue.lng },
      label: selectedVenue.name,
      mode: 'transit'
    });
  };

  const handleRallyHere = async () => {
    if (!selectedVenue || blocked) return;
    
    // Set plan context for preference learning
    await capture.setPlanContext({
      planId: `meethalfway-${selectedVenue.id}`,
      participantsCount: memberDists.length || 2,
      predictability: {
        spread: gp.spread,
        gain: gp.gain,
        ok: gp.ok,
        fallback: (gp.fallback === 'partition' || gp.fallback === 'relax_constraints') ? gp.fallback : null
      }
    });

    await capture.flushNow();
    onRallyHere();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[800px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-white/10">
            <SheetTitle className="text-left flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Meet Halfway
            </SheetTitle>
          </SheetHeader>

          {/* Category Filters */}
          <div className="p-4 border-b border-white/10">
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map(({ id, label, icon: Icon }) => {
                const isActive = categories.includes(id);
                return (
                  <Button
                    key={id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onToggleCategory(id)}
                    className={`flex items-center gap-2 whitespace-nowrap ${
                      isActive ? 'ring-2 ring-cyan-400/50' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Predictability Warning */}
          {!gp.ok && (
            <div className="p-4 border-b border-white/10">
              <div className="text-xs opacity-80">
                {gp.fallback === 'partition'
                  ? 'Preferences are diverse. Consider splitting into smaller subgroups.'
                  : 'Alignment is weak. Try relaxing time or location constraints.'}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="flex-1 p-4 overflow-hidden">
            {loading ? (
              <div className="h-full rounded-xl border border-white/10 bg-white/5 grid place-items-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto"></div>
                  <p className="text-white/60">Finding optimal meeting spots...</p>
                </div>
              </div>
            ) : data ? (
              <SmartMap
                data={data}
                selectedId={selectedId}
                onSelect={onSelectVenue}
                height={300}
              />
            ) : (
              <div className="h-full rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/50">
                No venues found
              </div>
            )}
          </div>

          {/* Venue Details & Actions */}
          {selectedVenue && (
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{selectedVenue.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-white/70 mt-1">
                    {selectedVenue.avg_eta_min && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedVenue.avg_eta_min} min avg
                      </div>
                    )}
                    {selectedVenue.meters_from_centroid && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {Math.round(selectedVenue.meters_from_centroid)}m from center
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleNavigate}
                    variant="outline"
                    className="flex-1 flex items-center gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    Get Directions
                  </Button>
                  <Button
                    onClick={handleRallyHere}
                    disabled={rallyLoading || blocked}
                    className="flex-1 ring-2 ring-cyan-400/50"
                  >
                    {rallyLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Creating Rally...
                      </>
                    ) : blocked ? (
                      gp.label
                    ) : (
                      'Rally Here'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}