import React from "react";
import { Coffee, Wine, UtensilsCrossed, X } from "lucide-react";
import SmartMap, { type MemberETA } from "@/components/maps/SmartMap";
import DirectionsSheet from "./DirectionsSheet";
import type { HalfResult } from "@/hooks/useHQMeetHalfway";
import { haversineMeters, etaMinutesMeters } from "@/lib/geo";

type Member = { profile_id:string; lat:number; lng:number; label?:string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: HalfResult;
  selectedId?: string | null;
  onSelectVenue: (id: string) => void;
  categories: string[];
  onToggleCategory: (category: string) => void;
  loading?: boolean;
  members?: Member[];                      // NEW
  onConfirmSend?: (venueId: string) => void; // NEW
};

const CATEGORIES = [
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "bar", label: "Bars", icon: Wine },
  { id: "food", label: "Food", icon: UtensilsCrossed },
];

export default function MeetHalfwaySheet({
  open, onOpenChange, data, selectedId, onSelectVenue,
  categories, onToggleCategory, loading, members = [],
  onConfirmSend,
}: Props) {
  // 1) Hooks must be unconditional
  const [dirOpen, setDirOpen] = React.useState(false);

  // Top3 options (safe even when closed or data undefined)
  const top3 = React.useMemo(() => 
    (data?.candidates ?? [])
      .slice()
      .sort((a,b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0,3)
  , [data]);

  // Selected venue (null-safe)
  const selected = React.useMemo(
    () =>
      (selectedId && data?.candidates?.find(c => c.id === selectedId)) ??
      top3[0] ??
      null,
    [selectedId, data, top3]
  );

  // Per-member ETAs for map labels (empty when no selection/members)
  const perMember = React.useMemo(() => {
    if (!selected || members.length === 0) return [];
    return members.map((m) => {
      const d = haversineMeters({ lat: m.lat, lng: m.lng }, { lat: selected.lat, lng: selected.lng });
      return { id: m.profile_id, lat: m.lat, lng: m.lng, eta_min: etaMinutesMeters(d, "walk") };
    });
  }, [selected?.lat, selected?.lng, JSON.stringify(members)]);

  // 2) Only now is it safe to return early
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />

      {/* HIGHER bottom-sheet: ~82vh on mobile, 92vh cap */}
      <div className="relative w-full sm:w-[820px] h-[82vh] sm:h-auto sm:max-h-[92vh] bg-zinc-950/95 border-t border-white/10 sm:border rounded-t-2xl sm:rounded-2xl backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
            <h2 className="text-sm font-semibold text-white/90">Meet Halfway</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          {/* Left: list + filters */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Category chips */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(({ id,label,icon:Icon }) => {
                const active = categories.includes(id);
                return (
                  <button key={id} onClick={() => onToggleCategory(id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs inline-flex items-center gap-2 transition ${
                      active ? "bg-white/10 border-white/20 text-white/90"
                             : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white/90"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                );
              })}
            </div>

            {/* Venues (top 3) */}
            <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Options ({top3.length})</div>
            <div className="space-y-2 overflow-y-auto">
              {loading ? (
                <div className="text-white/70 text-sm p-3">Finding optimal meeting spots…</div>
              ) : top3.length ? top3.map(v => (
                <button key={v.id} onClick={() => onSelectVenue(v.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedId === v.id ? "border-white/30 bg-white/10 ring-1 ring-white/20"
                                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white/90 truncate">{v.name}</div>
                      <div className="text-xs text-white/60 mt-1">
                        {v.meters_from_centroid ? <span>{Math.round(v.meters_from_centroid)}m from center</span> : null}
                        {v.avg_eta_min != null ? <span> • ~{Math.round(v.avg_eta_min)} min ETA</span> : null}
                      </div>
                    </div>
                    <div className="text-xs text-white/70 font-mono">{v.score?.toFixed(2)}</div>
                  </div>
                </button>
              )) : <div className="text-white/70 text-sm p-3">No venues found</div>}
            </div>

            {/* Per-member ETAs */}
            {selected && perMember.length>0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[12px] text-white/80 mb-1">ETAs to <b>{selected.name}</b></div>
                <div className="space-y-1 text-[12px] text-white/80">
                  {perMember.map(p => (
                    <div key={p.id} className="flex justify-between">
                      <span>{members.find(m => m.profile_id === p.id)?.label ?? p.id}</span>
                      <span>{p.eta_min} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto flex gap-2 pt-1 pb-[max(env(safe-area-inset-bottom),12px)]">
              <button
                className="px-4 py-2 rounded-xl bg-white/10 text-white/85 border border-white/10"
                onClick={()=>onOpenChange(false)}
              >Cancel</button>
              <button
                className="px-4 py-2 rounded-xl bg-white text-black font-medium shadow-[0_0_32px_rgba(129,140,248,.35)]"
                onClick={()=> selected && onConfirmSend?.(selected.id)}
              >Confirm & Send</button>
              <button
                className="px-3 py-2 rounded-xl bg-white/10 text-white/80 border border-white/10 hover:bg-white/15 transition-colors text-sm"
                onClick={() => selected && setDirOpen(true)}
              >
                Directions
              </button>
            </div>
          </div>

          {/* Right: Map */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
            {selected ? (
              <SmartMap
                data={data ? { centroid: data.centroid, candidates: data.candidates } : undefined}
                selectedId={selected.id}
                onSelect={onSelectVenue}
                members={members.map(m => ({ id: m.profile_id, lat: m.lat, lng: m.lng, label: m.label }))}
                memberEtas={perMember}
                height={loading ? 220 : 360}
              />
            ) : (
              <div className="h-[360px] grid place-items-center text-white/60 text-sm">No options found</div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <DirectionsSheet
          open={dirOpen}
          onClose={() => setDirOpen(false)}
          centroid={data?.centroid ?? { lat: 33.9925, lng: -118.4695 }}
          dest={{ lat: selected.lat, lng: selected.lng, name: selected.name }}
        />
      )}
    </div>
  );
}