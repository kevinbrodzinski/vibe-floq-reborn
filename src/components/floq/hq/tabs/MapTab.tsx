import React from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation2, Target, Thermometer, Users, Layers, Radio } from "lucide-react";
import { Section, Btn, Pill } from "../shared/components";
import { PEOPLE } from "../shared/constants";

interface MapTabProps {
  reduce: boolean;
  halfOpen: boolean;
  halfCats: string[];
  halfSel: string | null;
  halfAPI: any;
  halfLoading: boolean;
  rallyLoading: boolean;
  toXY: (p: { lat: number; lng: number }) => { x: number; y: number };
  onOpenMeetHalfway: () => void;
  onCloseHalfway: () => void;
  onToggleCat: (c: string) => void;
  onSetHalfSel: (id: string) => void;
  onRallyHere: () => void;
  onRallyResponse: (rallyId: string, status: "joined" | "maybe" | "declined") => void;
  panelAnim: any;
}

export function MapTab({
  reduce,
  halfOpen,
  halfCats,
  halfSel,
  halfAPI,
  halfLoading,
  rallyLoading,
  toXY,
  onOpenMeetHalfway,
  onCloseHalfway,
  onToggleCat,
  onSetHalfSel,
  onRallyHere,
  onRallyResponse,
  panelAnim
}: MapTabProps) {
  return (
    <motion.div key="map" id="panel-map" role="tabpanel" aria-labelledby="tab-map" {...panelAnim(reduce)} className="space-y-5">
      <Section
        title="Living Proximity Map"
        icon={<MapPin className="h-4 w-4" />}
        right={<Btn glow onClick={onOpenMeetHalfway}>Meet-Halfway</Btn>}
      >
        <div className="relative h-72 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 grid place-items-center text-xs text-white/60">(Map preview)</div>
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4 text-[12px] text-white/80">
          <div>You ↔ Sarah: 6 min • Café Nero (2) • Energy 88%</div>
          <div>Meeting point: Optimal • Convergence 94%</div>
          <div>Social Weather: Building energy • Pressure rising</div>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[13px]">
          4 converging at Coffee District · ETA 7:45 • Alignment high • Energy cost low
           <div className="mt-2 flex gap-2">
             <Btn glow onClick={() => onRallyResponse("RALLY_ID_PLACEHOLDER", "joined")}>Join</Btn>
             <Btn onClick={() => onRallyResponse("RALLY_ID_PLACEHOLDER", "maybe")}>Maybe</Btn>
             <Btn onClick={() => onRallyResponse("RALLY_ID_PLACEHOLDER", "declined")}>Can't</Btn>
           </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-white/70"><div className="flex-1 h-1 rounded-full bg-white/10 mx-3" /><div className="flex gap-2"><Btn ariaLabel="Target"><Target className="h-4 w-4" /></Btn><Btn ariaLabel="Thermometer"><Thermometer className="h-4 w-4" /></Btn><Btn ariaLabel="People"><Users className="h-4 w-4" /></Btn><Btn ariaLabel="Pin"><MapPin className="h-4 w-4" /></Btn></div></div>
      </Section>

      {halfOpen && (
        <div className="fixed inset-0 z-40">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onCloseHalfway} />

          {/* bottom sheet */}
          <div className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-zinc-900 border-t border-white/10 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold">Meet-Halfway</div>
              <Btn onClick={onCloseHalfway}>Close</Btn>
            </div>

            {/* category filters */}
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              {["coffee","bar","food","outdoor"].map(c => (
                <Btn
                  key={c}
                  active={halfCats.includes(c)}
                  onClick={() => onToggleCat(c)}
                >
                  {c}
                </Btn>
              ))}
              <Btn
                onClick={onOpenMeetHalfway}
                className="ml-auto"
              >
                {halfLoading ? "Updating…" : "Refine"}
              </Btn>
            </div>

            {/* map preview (in-app) */}
            <div className="mt-3 h-48 rounded-xl overflow-hidden border border-white/10 p-2">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                {/* soft grid */}
                <defs>
                  <pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#ffffff10" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="url(#g)" />
                
                {/* member dots */}
                {halfAPI?.members.map((m: any) => {
                  const p = toXY({lat: m.lat, lng: m.lng});
                  return <circle key={m.profile_id} cx={p.x * 100} cy={p.y * 100} r="3" fill="#f0f9ff" opacity="0.9" />;
                })}
                
                {/* centroid as green dot */}
                {halfAPI && (() => {
                  const p = toXY(halfAPI.centroid);
                  return <circle cx={p.x * 100} cy={p.y * 100} r="4" fill="#22c55e" />;
                })()}
                
                {/* polylines from members to selected candidate */}
                {halfAPI && halfSel && halfAPI.candidates.filter((c: any) => c.id === halfSel).map((c: any) => {
                  const k = toXY({lat: c.lat, lng: c.lng});
                  return (
                    <g key={c.id}>
                      {halfAPI.members.map((m: any) => {
                        const a = toXY({lat: m.lat, lng: m.lng});
                        return <line key={m.profile_id} x1={a.x * 100} y1={a.y * 100} x2={k.x * 100} y2={k.y * 100} stroke="#60a5fa" strokeOpacity="0.8" strokeWidth="2" />;
                      })}
                      <circle cx={k.x * 100} cy={k.y * 100} r="4" fill="#3b82f6" />
                    </g>
                  );
                })}
              </svg>
            </div>

             {/* ranked venue list */}
             <div className="mt-3 space-y-2">
                 {halfLoading && <div className="text-[12px] text-white/70">Computing midpoint…</div>}
                 {!halfLoading && !halfAPI && <div className="text-[12px] text-white/70">No data available</div>}
                 {!halfLoading && halfAPI?.candidates?.length === 0 && (
                   <div className="text-[12px] text-white/70">No venues found in the area</div>
                 )}
                 {!halfLoading && halfAPI?.candidates?.map((c: any) => {
                   const selected = c.id === (halfSel ?? halfAPI.candidates[0]?.id);
                   return (
                     <button
                       key={c.id}
                       type="button"
                       onClick={() => onSetHalfSel(c.id)}
                       className={`w-full text-left rounded-xl border p-3 text-[13px] transition ${
                         selected ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"
                       }`}
                     >
                       <div className="flex items-center justify-between">
                         <div className="font-medium text-white/90">{c.name}</div>
                         <div className="text-white/60 text-[12px]">
                           {(c.meters_from_centroid / 1000).toFixed(2)} km • {c.avg_eta_min} min
                         </div>
                       </div>
                     </button>
                   );
                 })}
             </div>

            {/* ETAs per member for the selected candidate */}
            {halfAPI && (halfSel || halfAPI.candidates[0]) && (
              <div className="mt-3 text-[12px] text-white/80">
                <div className="mb-1 font-medium text-white/90">Estimated time:</div>
                <ul className="list-disc ml-5">
                  {halfAPI.candidates.find((c: any) => c.id === (halfSel ?? halfAPI.candidates[0]?.id))?.per_member.map((pm: any) => (
                    <li key={pm.profile_id}>Member: {pm.eta_min} min</li>
                  ))}
                </ul>
              </div>
            )}

            {/* primary action */}
             <div className="mt-3 flex justify-end">
               <Btn
                 glow
                 onClick={onRallyHere}
                 disabled={halfLoading || !halfAPI?.candidates?.length}
               >
                 {rallyLoading ? "Setting…" : "Rally Here"}
               </Btn>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Live Status" icon={<Radio className="h-4 w-4" />}>
          <div className="space-y-3 text-[13px]">{PEOPLE.map(p=> (
            <div key={p.n} className="flex items-center justify-between"><div className="text-white/90">{p.n} <span className="text-white/60">• {p.d}</span></div><div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" style={{width:`${p.v}%`}} /></div></div>
          ))}</div>
        </Section>
        <Section title="Smart Layers" icon={<Layers className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3 text-[12px]"><div>Venues (warm/cool)</div><div>Energy fields</div><div className="opacity-70">Friend floqs</div><div className="opacity-70">Events</div></div>
        </Section>
      </div>
    </motion.div>
  );
}