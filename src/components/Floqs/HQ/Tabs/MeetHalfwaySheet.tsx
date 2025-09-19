import React from "react";
import { Coffee, Wine, UtensilsCrossed, X } from "lucide-react";
import SmartMap from "@/components/maps/SmartMap";
import type { HalfResult } from "@/hooks/useHQMeetHalfway";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: HalfResult;
  selectedId?: string | null;
  onSelectVenue: (id: string) => void;
  categories: string[];
  onToggleCategory: (category: string) => void;
  loading?: boolean;
  onRallyHere?: () => void;
};

const CATEGORIES = [
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "bar", label: "Bars", icon: Wine },
  { id: "restaurant", label: "Food", icon: UtensilsCrossed },
];

export default function MeetHalfwaySheet({
  open,
  onOpenChange,
  data,
  selectedId,
  onSelectVenue,
  categories,
  onToggleCategory,
  loading,
  onRallyHere,
}: Props) {
  if (!open) return null;

  const selected = data?.candidates.find(c => c.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950/95 border-t border-white/10 rounded-t-2xl sm:rounded-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"></div>
            <h2 className="text-sm font-semibold text-white/90">Meet Halfway</h2>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Category filters */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const active = categories.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => onToggleCategory(id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs inline-flex items-center gap-2 transition-all
                    ${active 
                      ? "bg-white/10 border-white/20 text-white/90" 
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white/90"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5" style={{ height: 280 }}>
            {loading ? (
              <div className="h-full flex items-center justify-center text-white/60 text-sm">
                Finding optimal meeting spots…
              </div>
            ) : data ? (
              <SmartMap 
                data={data} 
                selectedId={selectedId} 
                onSelect={onSelectVenue} 
                height={280}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/60 text-sm">
                No venues found
              </div>
            )}
          </div>

          {/* Venue list */}
          {data?.candidates && data.candidates.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="text-xs text-white/60 font-medium uppercase tracking-wide">
                Venues ({data.candidates.length})
              </div>
              {data.candidates.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => onSelectVenue(venue.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedId === venue.id
                      ? "border-white/30 bg-white/10 ring-1 ring-white/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white/90 truncate">
                        {venue.name}
                      </div>
                      <div className="text-xs text-white/60 mt-1">
                        {venue.meters_from_centroid && (
                          <span>{Math.round(venue.meters_from_centroid)}m from center</span>
                        )}
                        {venue.avg_eta_min && (
                          <span> • ~{Math.round(venue.avg_eta_min)} min ETA</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-white/70 font-mono">
                      {venue.score?.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {selected && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">
                  {selected.name}
                </div>
                <div className="text-xs text-white/60">
                  Ready to rally at this location
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 rounded-xl bg-white/10 text-white/80 border border-white/10 hover:bg-white/15 transition-colors text-sm"
                  onClick={() => {
                    // TODO: Open directions
                    console.log('Navigate to', selected.name);
                  }}
                >
                  Directions
                </button>
                <button 
                  className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors text-sm"
                  onClick={onRallyHere}
                >
                  Rally Here
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}