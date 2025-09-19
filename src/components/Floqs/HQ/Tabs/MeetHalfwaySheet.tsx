import React from "react";
import SmartMap from "@/components/Common/SmartMap";
import type { HalfResult } from "@/hooks/useHQMeetHalfway";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: HalfResult | null;
  selectedId?: string | null;
  onSelectVenue: (id: string) => void;
  categories: string[];
  onToggleCategory: (category: string) => void;
  loading?: boolean;
  onNavigate?: (id: string) => void;
  onRallyHere?: () => void;
};

const CATS = [
  { id: "coffee", label: "Coffee" },
  { id: "bar", label: "Bars" },
  { id: "food", label: "Food" },
] as const;

export default function MeetHalfwaySheet({
  open,
  onOpenChange,
  data,
  selectedId,
  onSelectVenue,
  categories,
  onToggleCategory,
  loading,
  onNavigate,
  onRallyHere,
}: Props) {
  if (!open) return null;

  const selected = data?.candidates.find((c) => c.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative w-full sm:w-[760px] max-h-[85vh] overflow-auto rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400" />
            <div className="text-[13px] font-semibold tracking-wide text-white/90 uppercase">Meet Halfway</div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70">Close</button>
        </div>

        {/* Category filter chips */}
        <div className="p-4 flex flex-wrap gap-2">
          {CATS.map(({ id, label }) => {
            const active = categories.includes(id);
            return (
              <button
                key={id}
                onClick={() => onToggleCategory(id)}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                  active ? "bg-white/10 border-white/20 text-white/90" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="h-[280px] rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 text-sm">
              Finding optimal meeting spots…
            </div>
          ) : data ? (
            <SmartMap data={{ centroid: data.centroid, candidates: data.candidates }} selectedId={selectedId} onSelect={onSelectVenue} height={280} />
          ) : (
            <div className="h-[280px] rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 text-sm">
              Map preview
            </div>
          )}
        </div>

        {/* Venue list */}
        {data?.candidates?.length ? (
          <div className="px-4 pb-3">
            <div className="text-[12px] text-white/60 mb-2">Venues ({data.candidates.length})</div>
            <div className="space-y-2">
              {data.candidates.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelectVenue(v.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedId === v.id ? "border-white/30 bg-white/10 ring-1 ring-white/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white/90 text-[14px]">{v.name}</div>
                      <div className="text-white/60 text-[12px]">
                        {v.meters_from_centroid ? `${Math.round(v.meters_from_centroid)}m` : "—"} from center
                        {v.avg_eta_min != null ? ` • ~${Math.round(v.avg_eta_min)} min ETA` : ""}
                      </div>
                    </div>
                    <div className="text-white/60 text-[12px]">{v.score != null ? v.score.toFixed(2) : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 text-white/60 text-sm">No spots match those filters.</div>
        )}

        {/* Actions */}
        {selected && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] text-white/90">{selected.name}</div>
              <div className="text-[12px] text-white/60">Ready to rally at this location</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate?.(selected.id)}
                className="px-3 py-2 rounded-xl bg-white/10 text-white/80 border border-white/10"
              >
                Directions
              </button>
              <button
                onClick={onRallyHere}
                className="px-3 py-2 rounded-xl bg-white text-black font-medium shadow-[0_0_32px_rgba(168,85,247,.35)]"
              >
                Rally Here
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}