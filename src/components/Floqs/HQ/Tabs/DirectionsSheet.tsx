import React, { useMemo, useState } from "react";
import SmartMap from "@/components/maps/SmartMap";
import { useOriginForDirections } from "@/hooks/useOriginForDirections";
import { useDirections } from "@/hooks/useDirections";

export default function DirectionsSheet({
  open, onClose,
  centroid,
  dest, // { lat, lng, name }
}: {
  open: boolean;
  onClose: () => void;
  centroid: { lat:number; lng:number };
  dest: { lat:number; lng:number; name:string };
}) {
  const [mode, setMode] = useState<"walking"|"driving">("walking");
  const origin = useOriginForDirections(open) ?? centroid;
  const { data, isLoading } = useDirections(origin, dest, mode, open);

  const etaMin = data ? Math.round(data.duration_s/60) : null;
  const distKm = data ? (data.distance_m/1000).toFixed(1) : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950/95 border border-white/10 rounded-t-2xl sm:rounded-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="text-white/90 text-sm font-semibold">Directions — {dest.name}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("walking")}
              className={`px-3 py-1.5 rounded-xl border text-xs ${mode==="walking" ? "bg-white text-black" : "bg-white/5 border-white/10 text-white/80"}`}
            >Walk</button>
            <button
              onClick={() => setMode("driving")}
              className={`px-3 py-1.5 rounded-xl border text-xs ${mode==="driving" ? "bg-white text-black" : "bg-white/5 border-white/10 text-white/80"}`}
            >Drive</button>
          </div>
        </div>

        <div className="p-4">
          <SmartMap
            data={{ centroid, candidates: [] }}
            route={data?.geometry ?? null}
            height={260}
          />
          <div className="mt-3 text-white/80 text-sm">
            {isLoading ? "Calculating route…" : etaMin !== null ? `${etaMin} min • ${distKm} km` : "No route"}
          </div>

          <div className="mt-3 max-h-48 overflow-y-auto text-white/80 text-sm space-y-2">
            {data?.steps?.map((s, i) => (
              <div key={i} className="flex gap-2">
                <div className="text-white/50 w-8 flex-shrink-0">{i+1}.</div>
                <div className="flex-1">
                  {s.instruction}
                  <div className="text-[11px] text-white/50">{Math.round(s.distance_m)} m • {Math.round(s.duration_s/60)} min</div>
                </div>
              </div>
            ))}
            {!data && !isLoading && <div>No steps.</div>}
          </div>

          <div className="mt-4 flex justify-end">
            <button className="px-4 py-2 rounded-xl bg-white text-black font-medium" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}