import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SmartMap from "@/components/Common/SmartMap";
import { useHQMeetHalfway } from "@/hooks/useHQMeetHalfway";
import {
  MapPin,
  MessageSquare,
  CalendarCheck,
  Camera,
  Radio,
  BarChart3,
  Shield,
  Sparkles,
  Navigation2,
  Target,
  Users,
  Gauge,
  Settings,
  Bell,
  Layers,
  Thermometer,
  UserPlus,
  Star,
  Check,
  MoreHorizontal,
  Trophy,
  Flame
} from "lucide-react";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] text-white/80 border border-white/10">{children}</span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; ariaLabel?: string };
function Btn({ children, active, ariaLabel, className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-label={ariaLabel}
      className={`px-3 py-1.5 rounded-xl border text-[12px] transition ${
        active ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Section({ title, icon, right, children }: { title: string; icon: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-white/10 grid place-items-center text-white/80">{icon}</div>
          <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500" style={{ width: `${value}%` }} />
    </div>
  );
}

const TABS = [
  { k: "map", l: "Map", i: <MapPin className="h-4 w-4" /> },
  { k: "stream", l: "Stream", i: <MessageSquare className="h-4 w-4" /> },
  { k: "plan", l: "Plan", i: <CalendarCheck className="h-4 w-4" /> },
  { k: "moments", l: "Moments", i: <Camera className="h-4 w-4" /> },
  { k: "pulse", l: "Pulse", i: <Radio className="h-4 w-4" /> },
  { k: "venues", l: "Venues", i: <MapPin className="h-4 w-4" /> },
  { k: "analytics", l: "Analytics", i: <BarChart3 className="h-4 w-4" /> },
  { k: "wing", l: "Wing", i: <Sparkles className="h-4 w-4" /> },
  { k: "privacy", l: "Privacy", i: <Shield className="h-4 w-4" /> }
] as const;

type TabKey = typeof TABS[number]["k"];

const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", v: 60 },
  { n: "Tom", d: "Downtown • Hype", v: 85 },
  { n: "Alex", d: "Beach→Venice", v: 80 },
  { n: "You", d: "Home • Neutral", v: 45 }
];

const VENUES = [
  { r: 1, name: "Gran Blanco", meta: "Bar • Downtown · Last: 2 days", note: "Our unofficial headquarters", badge: "47× 👑" },
  { r: 2, name: "Café Nero", meta: "Coffee • Venice · Last: 1 week", note: "Perfect for hangover recovery", badge: "31×" },
  { r: 3, name: "Venice Beach", meta: "Outdoor • Beach · Last: 2 weeks", note: "Beach volleyball crew", badge: "28×" }
];

const panelAnim = (reduce: boolean) => ({
  initial: reduce ? false : { opacity: 0, y: 10 },
  animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0 },
  exit: reduce ? { opacity: 0 } : { opacity: 0, y: -10 }
});

export default function FloqHQTabbed() {
  const [active, setActive] = useState<TabKey>("map");
  const reduce = useReducedMotion();
  const { floqId: actualFloqId } = useParams<{ floqId: string }>();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [rallyLoading, setRallyLoading] = useState(false);

  // ── Meet-Halfway bottom sheet state ────────────────────────────
  const [halfOpen, setHalfOpen] = useState(false);
  const [halfCats, setHalfCats] = useState<string[]>([]); // e.g., ["coffee","bar"]
  const [halfSel, setHalfSel] = useState<string | null>(null);
  
  const { data: halfAPI, isLoading: halfLoading, refetch: refetchHalf } =
    useHQMeetHalfway(actualFloqId, halfCats, halfOpen);

  useEffect(() => { 
    if (halfOpen) refetchHalf(); 
  }, [halfOpen, halfCats, refetchHalf]);

  // Project lat/lng to 0..1 viewport for SVG
  const allPts = useMemo(() => {
    if (!halfAPI) return [];
    const base = [halfAPI.centroid, ...halfAPI.members.map(m=>({lat:m.lat,lng:m.lng}))];
    const cand = halfAPI.candidates.map(c=>({lat:c.lat,lng:c.lng}));
    return [...base, ...cand];
  }, [halfAPI]);

  const toXY = useMemo(() => {
    if (!allPts.length) return (p: {lat: number; lng: number}) => ({x: 0.5, y: 0.5});
    const lats = allPts.map(p=>p.lat), lngs = allPts.map(p=>p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const dx = Math.max(1e-9, maxLng - minLng);
    const dy = Math.max(1e-9, maxLat - minLat);
    return (p: {lat: number; lng: number}) => ({
      x: (p.lng - minLng) / dx,
      y: 1 - (p.lat - minLat) / dy, // flip Y for screen coords
    });
  }, [allPts]);

  const toggleCat = (c: string) =>
    setHalfCats(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));

  // Set initial selection when data loads
  useEffect(() => {
    if (halfAPI?.candidates?.length && !halfSel) {
      setHalfSel(halfAPI.candidates[0].id);
    }
  }, [halfAPI, halfSel]);

  async function handleStartRally(note?: string) {
    if (!actualFloqId) return;
    try {
      setRallyLoading(true);
      const { error } = await supabase.functions.invoke("rally-create", {
        body: { floq_id: actualFloqId, note: note ?? "", ttl_min: 60 }
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["floqs-cards"] });
      queryClient.invalidateQueries({ queryKey: ["hq-digest", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["hq-vibes", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["hq-availability", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["floq", actualFloqId, "stream"] });
    } catch (e) {
      console.error(e);
    } finally {
      setRallyLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!actualFloqId) return;
    const el = document.getElementById("hq-message") as HTMLInputElement | null;
    const body = el?.value?.trim();
    if (!body) return;

    try {
      setSending(true);
      const { error } = await supabase.functions.invoke("hq-stream-post", {
        body: { floq_id: actualFloqId, kind: "text", body }
      });
      if (error) throw error;

      if (el) el.value = "";
      queryClient.invalidateQueries({ queryKey: ["floq", actualFloqId, "stream"] });
      queryClient.invalidateQueries({ queryKey: ["hq-digest", actualFloqId] });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function handleRallyResponse(rallyId: string, status: "joined" | "maybe" | "declined") {
    if (!actualFloqId) return;
    try {
      const { error } = await supabase.functions.invoke("rally-join", {
        body: { rallyId, status }
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["floqs-cards"] });
      queryClient.invalidateQueries({ queryKey: ["hq-digest", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["hq-vibes", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["hq-availability", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["floq", actualFloqId, "stream"] });
    } catch (e) {
      console.error(e);
    }
  }

  async function openMeetHalfway() {
    setHalfOpen(true);
    refetchHalf();
  }

  async function rallyHere() {
    if (!halfAPI) return;
    const pick = halfAPI.candidates.find(x => x.id === (halfSel ?? halfAPI.candidates[0]?.id));
    if (!pick || !actualFloqId) return;
    
    try {
      setRallyLoading(true);
      await supabase.functions.invoke("rally-create", {
        body: { 
          floq_id: actualFloqId, 
          center: { lat: pick.lat, lng: pick.lng }, 
          venue_id: pick.id, 
          note: `Meet at ${pick.name}`,
          ttl_min: 60 
        }
      });
      
      // Invalidate the same caches used by Start Rally
      queryClient.invalidateQueries({ queryKey: ["floqs-cards"] });
      queryClient.invalidateQueries({ queryKey: ["hq-digest", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["hq-vibes", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["hq-availability", actualFloqId] });
      queryClient.invalidateQueries({ queryKey: ["floq", actualFloqId, "stream"] });
      
      setHalfOpen(false);
    } catch (e) {
      console.error("Rally creation failed:", e);
    } finally {
      setRallyLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-zinc-950/70">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg grid place-items-center"><Sparkles className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">Chaos<span className="sr-only">Private Floq</span></div>
              <div className="text-[11px] text-white/60">"Spontaneous convergence specialists since 2022"</div>
              <div className="text-[11px] text-white/60">8 members • Social-Hype</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Btn ariaLabel="Settings"><Settings className="h-4 w-4" /></Btn>
            <div className="relative"><Btn ariaLabel="Notifications"><Bell className="h-4 w-4" /></Btn><span className="absolute -top-1 -right-1 text-[10px] bg-rose-500 text-white rounded-full px-1">3</span></div>
            <Btn ariaLabel="Invite"><UserPlus className="h-4 w-4" /></Btn>
            <Btn ariaLabel="More options"><MoreHorizontal className="h-4 w-4" /></Btn>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div role="tablist" aria-label="Floq sections" className="flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((t, idx) => {
              const selected = active === t.k;
              return (
                <button
                  key={t.k}
                  id={`tab-${t.k}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${t.k}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(t.k)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") setActive(TABS[(idx + 1) % TABS.length].k);
                    if (e.key === "ArrowLeft")  setActive(TABS[(idx - 1 + TABS.length) % TABS.length].k);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] border transition ${
                    selected ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {t.i}<span>{t.l}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          {active === "map" && (
            <motion.div key="map" id="panel-map" role="tabpanel" aria-labelledby="tab-map" {...panelAnim(reduce)} className="space-y-5">
              <Section
                title="Living Proximity Map"
                icon={<MapPin className="h-4 w-4" />}
                right={<Btn onClick={openMeetHalfway}>Meet-Halfway</Btn>}
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
                    <Btn onClick={() => handleRallyResponse("RALLY_ID_PLACEHOLDER", "joined")}>Join</Btn>
                    <Btn onClick={() => handleRallyResponse("RALLY_ID_PLACEHOLDER", "maybe")}>Maybe</Btn>
                    <Btn onClick={() => handleRallyResponse("RALLY_ID_PLACEHOLDER", "declined")}>Can't</Btn>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px] text-white/70"><div className="flex-1 h-1 rounded-full bg-white/10 mx-3" /><div className="flex gap-2"><Btn ariaLabel="Target"><Target className="h-4 w-4" /></Btn><Btn ariaLabel="Thermometer"><Thermometer className="h-4 w-4" /></Btn><Btn ariaLabel="People"><Users className="h-4 w-4" /></Btn><Btn ariaLabel="Pin"><MapPin className="h-4 w-4" /></Btn></div></div>
              </Section>

              {halfOpen && (
                <div className="fixed inset-0 z-40">
                  {/* backdrop */}
                  <div className="absolute inset-0 bg-black/50" onClick={() => setHalfOpen(false)} />

                  {/* bottom sheet */}
                  <div className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-zinc-900 border-t border-white/10 p-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold">Meet-Halfway</div>
                      <Btn onClick={() => setHalfOpen(false)}>Close</Btn>
                    </div>

                    {/* category filters */}
                    <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                      {["coffee","bar","food","outdoor"].map(c => (
                        <Btn
                          key={c}
                          active={halfCats.includes(c)}
                          onClick={() => toggleCat(c)}
                        >
                          {c}
                        </Btn>
                      ))}
                      <Btn
                        onClick={openMeetHalfway}
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
                        {halfAPI?.members.map((m) => {
                          const p = toXY({lat: m.lat, lng: m.lng});
                          return <circle key={m.profile_id} cx={p.x * 100} cy={p.y * 100} r="3" fill="#f0f9ff" opacity="0.9" />;
                        })}
                        
                        {/* centroid as green dot */}
                        {halfAPI && (() => {
                          const p = toXY(halfAPI.centroid);
                          return <circle cx={p.x * 100} cy={p.y * 100} r="4" fill="#22c55e" />;
                        })()}
                        
                        {/* polylines from members to selected candidate */}
                        {halfAPI && halfSel && halfAPI.candidates.filter(c => c.id === halfSel).map(c => {
                          const k = toXY({lat: c.lat, lng: c.lng});
                          return (
                            <g key={c.id}>
                              {halfAPI.members.map(m => {
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
                        {!halfLoading && halfAPI?.candidates?.map(c => {
                          const selected = c.id === (halfSel ?? halfAPI.candidates[0]?.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setHalfSel(c.id)}
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
                          {halfAPI.candidates.find(c => c.id === (halfSel ?? halfAPI.candidates[0]?.id))?.per_member.map(pm => (
                            <li key={pm.profile_id}>Member: {pm.eta_min} min</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* primary action */}
                    <div className="mt-3 flex justify-end">
                      <Btn
                        onClick={rallyHere}
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
          )}

          {active === "stream" && (
            <motion.div key="stream" id="panel-stream" role="tabpanel" aria-labelledby="tab-stream" {...panelAnim(reduce)} className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex gap-2"><Btn active>Crew (2)</Btn><Btn>Plans (1)</Btn><Btn>Live</Btn><Btn>Memories</Btn></div>
                <div className="flex gap-2">
                  <Btn>Wing</Btn>
                  <Btn>Filter</Btn>
                  <Btn onClick={() => handleStartRally()}>{rallyLoading ? "Starting…" : "+ Start Rally"}</Btn>
                </div>
              </div>
              <Section title="Rally" icon={<Navigation2 className="h-4 w-4" />}>
                <div className="text-sm font-medium mb-1">Tom started a Rally · 2m</div>
                <div className="text-[13px] text-white/80 mb-2">@everyone drinks at @GranBlanco in 1 hr?</div>
                <div className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-[12px]">
                  Rally: Gran Blanco @ 8:30 • Going: 3 • Deciding: 2 • No reply: 3
                  <div className="mt-2 flex gap-2">
                    <Btn onClick={() => handleRallyResponse("RALLY_ID_PLACEHOLDER", "joined")}>Join</Btn>
                    <Btn onClick={() => handleRallyResponse("RALLY_ID_PLACEHOLDER", "maybe")}>Maybe</Btn>
                    <Btn onClick={() => handleRallyResponse("RALLY_ID_PLACEHOLDER", "declined")}>Can't</Btn>
                  </div>
                </div>
              </Section>
              <Section title="Moment" icon={<Camera className="h-4 w-4" />}><div className="text-sm font-medium mb-1">Sarah shared a moment · 12m</div><div className="rounded-xl aspect-[16/9] bg-zinc-900 border border-white/10 grid place-items-center text-white/60 text-xs">photo</div></Section>
              <Section title="Pinned Decision" icon={<Check className="h-4 w-4" />}><div className="text-sm font-semibold">Friday Dinner @ Koi Sushi · 7:30pm</div><div className="text-[12px] text-white/80">Confirmed by 5/8 • Added to calendar</div></Section>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
                <input id="hq-message" className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40" placeholder="Type message…" />
                <Btn>@</Btn>
                <Btn><Camera className="h-4 w-4" /></Btn>
                <Btn><MapPin className="h-4 w-4" /></Btn>
                <Btn onClick={handleSendMessage} disabled={sending}>
                  {sending ? "Sending…" : "Send"}
                </Btn>
              </div>
            </motion.div>
          )}

          {active === "plan" && (
            <motion.div key="plan" id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" {...panelAnim(reduce)} className="space-y-5">
              <div className="flex flex-wrap gap-2"><Btn>+ Solo Plan</Btn><Btn>+ Group Plan</Btn><Btn>View Calendar</Btn><Btn>Wingman Help</Btn></div>
              <Section title="Thursday Tradition @ Gran" icon={<Check className="h-4 w-4" />} right={<Pill>Locked</Pill>}><div className="text-[13px]">8:30pm • 6/8 confirmed • Recurring weekly</div><div className="text-[12px] text-white/70">Energy: Social-Hype • Friction: Low</div></Section>
              <Section title="Dinner @ Koi Sushi" icon={<CalendarCheck className="h-4 w-4" />} right={<Pill>Building</Pill>}><div className="text-[13px]">7:30pm • 5 confirmed, 2 pending · Organizer: Sarah</div><div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[12px]">Live Planning: 3 active • "I can pick up Tom and Alex" • "Jake is vegetarian"</div></Section>
              <Section title="Beach Day" icon={<CalendarCheck className="h-4 w-4" />} right={<Pill>Tentative</Pill>}><div className="text-[13px]">All day • Flexible • Weather dependent</div><div className="text-[12px] text-white/70">Forecast: Perfect • Backup: Indoor climbing</div></Section>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-[13px]">Suggested by Wingman: Sunday Brunch? 4 usually free<div className="mt-2 flex gap-2"><Btn>Create Plan</Btn><Btn>Not This Week</Btn><Btn>Never Suggest</Btn></div></div>
            </motion.div>
          )}

          {active === "moments" && (
            <motion.div key="moments" id="panel-moments" role="tabpanel" aria-labelledby="tab-moments" {...panelAnim(reduce)} className="space-y-5">
              <Section title="Tonight — Thu Sept 12" icon={<Camera className="h-4 w-4" />} right={<Pill>Live Now</Pill>}><div className="text-[13px]">"Thursday Tradition #5" • Now →</div><div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-2/3 bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" /></div><div className="text-[12px] text-white/80 mt-2">Current: Gran Blanco • Building to peak</div></Section>
              <Section title="Last Thursday — Sept 5" icon={<Star className="h-4 w-4" />} right={<Pill>Score 5/5</Pill>}><div className="text-[13px]">"Legendary Karaoke Night" • 4h 13m</div><div className="text-[12px] text-white/80">Highlights: Rap battle win • 27 moments • Convergence 94/100</div></Section>
              <Section title="Aug 28 — Beach Birthday Bash" icon={<Star className="h-4 w-4" />} right={<Pill>Score 4/5</Pill>}><div className="text-[13px]">8/8 attended • 6h • Perfect weather</div></Section>
              <div className="text-[12px] text-white/80">Pattern: Thursday Tradition (5 weeks)</div>
            </motion.div>
          )}

          {active === "pulse" && (
            <motion.div key="pulse" id="panel-pulse" role="tabpanel" aria-labelledby="tab-pulse" {...panelAnim(reduce)} className="space-y-5">
              <Section title="Group Pulse" icon={<Gauge className="h-4 w-4" />} right={<Btn>Activate Convergence</Btn>}><div className="text-[13px]">High potential • 3 free now • 2 free soon • Optimal: Coffee District</div></Section>
              {PEOPLE.slice(0,3).map((p,i)=> (
                <Section key={p.n} title={`${p.n}`} icon={<Users className="h-4 w-4" />} right={<Pill>{i===0?"Energy 92":i===1?"Energy 45":"Ghost"}</Pill>}>
                  <div className="text-[12px] text-white/80">Status details</div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-3 text-[12px] text-white/80"><div>Location info</div><div>Vibe info</div></div>
                </Section>
              ))}
            </motion.div>
          )}

          {active === "venues" && (
            <motion.div key="venues" id="panel-venues" role="tabpanel" aria-labelledby="tab-venues" {...panelAnim(reduce)} className="space-y-5">
              <div className="flex items-center justify-between"><div className="flex gap-2 flex-wrap"><Btn active>All</Btn><Btn>Day</Btn><Btn>Night</Btn><Btn>Food</Btn><Btn>Bars</Btn><Btn>Activities</Btn></div><Btn>All Time</Btn></div>
              <Section title="Our Top Spots" icon={<MapPin className="h-4 w-4" />}>
                {VENUES.map(v=> (
                  <div key={v.r} className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3"><div className="flex items-center justify-between"><div className="text-sm font-semibold">{v.r}. {v.name}</div><Pill>{v.badge}</Pill></div><div className="text-[12px] text-white/70">{v.meta}</div><div className="text-[12px] text-white/80 mt-1 italic">"{v.note}"</div><div className="mt-2 flex gap-2"><Btn>Navigate</Btn><Btn>Rally Here</Btn><Btn>History</Btn></div></div>
                ))}
              </Section>
            </motion.div>
          )}

          {active === "analytics" && (
            <motion.div key="analytics" id="panel-analytics" role="tabpanel" aria-labelledby="tab-analytics" {...panelAnim(reduce)} className="space-y-5">
              <div className="flex flex-wrap gap-2"><Btn active>Overview</Btn><Btn>Dynamics</Btn><Btn>Patterns</Btn><Btn>Archetypes</Btn><Btn>Export</Btn></div>
              <Section title="Tribe Health" icon={<BarChart3 className="h-4 w-4" />}><div className="text-[13px]">Score 87/100 • Momentum building • 12 convergences</div><div className="mt-2"><Bar value={87} /></div></Section>
              <div className="grid lg:grid-cols-2 gap-5">
                <Section title="Your Role" icon={<Users className="h-4 w-4" />}><div className="text-[13px]">Catalyst • Initiate 42% • +15% vibe lift</div><div className="text-[12px] text-white/80">Strongest: You↔Sarah • Needs: You↔Jake</div></Section>
                <Section title="Weekly Rhythm" icon={<Gauge className="h-4 w-4" />}><div className="text-[12px] text-white/80">Mon recovery • Tue build • Wed social • Thu peak • Fri high • Sat var • Sun recharge</div><div className="mt-2 h-20 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white/60 text-xs">(Heatmap)</div></Section>
              </div>
              <Section title="Insights" icon={<Target className="h-4 w-4" />}><div className="grid md:grid-cols-2 gap-3 text-[13px]"><div className="rounded-xl bg-white/5 border border-white/10 p-3">Thu tradition at risk<div className="mt-2"><Btn>Rally the Crew</Btn></div></div><div className="rounded-xl bg-white/5 border border-white/10 p-3">Jake engagement dropping<div className="mt-2 flex gap-2"><Btn>Reach Out</Btn><Btn>View Relationship</Btn></div></div></div></Section>
            </motion.div>
          )}

          {active === "wing" && (
            <motion.div key="wing" id="panel-wing" role="tabpanel" aria-labelledby="tab-wing" {...panelAnim(reduce)} className="space-y-5">
              <Section title="Suggestions" icon={<Sparkles className="h-4 w-4" />}><div className="grid md:grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">Thursday Tradition at risk<div className="mt-2 flex gap-2"><Btn>Create Rally</Btn><Btn>Send Reminder</Btn><Btn>Skip</Btn></div></div><div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">Jake needs attention<div className="mt-2 flex gap-2"><Btn>Suggest 1-on-1</Btn><Btn>Add to next plan</Btn><Btn>Let it be</Btn></div></div></div></Section>
              <Section title="Ask Wingman" icon={<MessageSquare className="h-4 w-4" />}><div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[12px] text-white/60">Try: find common time • best venue for 10 • who hasn't converged • chill Sunday plan</div><div className="mt-3 flex items-center gap-2"><input className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40" placeholder="Ask Wingman…" /><Btn>Send</Btn></div></div></Section>
              <Section title="Chat" icon={<MessageSquare className="h-4 w-4" />}><div className="text-[13px]">You: Find us a new bar to try</div><div className="mt-2 rounded-xl bg-white/5 border border-white/10 p-3 text-[12px] text-white/80"><ol className="list-decimal ml-5 space-y-1"><li>The Brig — 0.5mi • live music</li><li>Townhouse — dive • pool tables</li><li>Rooftop at Erwin — sunset views</li></ol><div className="mt-2 flex gap-2"><Btn>Create Poll</Btn><Btn>Directions</Btn><Btn>More</Btn></div></div></Section>
            </motion.div>
          )}

          {active === "privacy" && (
            <motion.div key="privacy" id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy" {...panelAnim(reduce)} className="space-y-5">
              <Section title="Privacy Controls" icon={<Shield className="h-4 w-4" />}><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{["Precise","Neighborhood","Status Only","Ghost"].map(l=>(<Btn key={l}>{l}</Btn>))}</div><div className="mt-2 text-[11px] text-white/60">Auto-rules: Ghost after 11pm • Precise during rallies • Status at work</div></Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}