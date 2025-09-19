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
  Settings,
  Bell,
  UserPlus,
  MoreHorizontal,
  Trophy,
  Flame
} from "lucide-react";

// Import shared UI components
import Pill from "@/components/Floqs/HQ/ui/Pill";
import Btn from "@/components/Floqs/HQ/ui/Btn";
import Section from "@/components/Floqs/HQ/ui/Section";
import Bar from "@/components/Floqs/HQ/ui/Bar";

// Import tab components
import MapTab from "@/components/Floqs/HQ/Tabs/MapTab";
import StreamTab from "@/components/Floqs/HQ/Tabs/StreamTab";
import PlanTab from "@/components/Floqs/HQ/Tabs/PlanTab";
import MomentsTab from "@/components/Floqs/HQ/Tabs/MomentsTab";
import PulseTab from "@/components/Floqs/HQ/Tabs/PulseTab";
import VenuesTab from "@/components/Floqs/HQ/Tabs/VenuesTab";
import AnalyticsTab from "@/components/Floqs/HQ/Tabs/AnalyticsTab";
import WingTab from "@/components/Floqs/HQ/Tabs/WingTab";
import PrivacyTab from "@/components/Floqs/HQ/Tabs/PrivacyTab";

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
            <div className="h-9 w-9 avatar-glow rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center"><Sparkles className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                Chaos<span className="sr-only">Private Floq</span>
              </div>
              <div className="text-[11px] text-white/60">"Spontaneous convergence specialists since 2022"</div>
              <div className="text-[11px] text-white/60">8 members • Social-Hype</div>
              <div className="flex flex-wrap gap-1.5 max-w-[280px] mt-1">
                <Pill glow><Trophy className="inline h-3 w-3 mr-1" />Thursday Legends</Pill>
                <Pill glow><Flame className="inline h-3 w-3 mr-1" />5-Week Streak</Pill>
                <Pill glow><MapPin className="inline h-3 w-3 mr-1" />Gran Regulars</Pill>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Btn aria-label="Settings"><Settings className="h-4 w-4" /></Btn>
            <div className="relative"><Btn aria-label="Notifications"><Bell className="h-4 w-4" /></Btn><span className="absolute -top-1 -right-1 text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 shadow-[0_0_12px_rgba(239,68,68,0.6)]">3</span></div>
            <Btn aria-label="Invite"><UserPlus className="h-4 w-4" /></Btn>
            <Btn aria-label="More options"><MoreHorizontal className="h-4 w-4" /></Btn>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2" role="tablist" aria-label="Floq HQ Tabs">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((t, idx) => {
              const selected = active === t.k;
              return (
                <button
                  key={t.k}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${t.k}`}
                  id={`tab-${t.k}`}
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
            <motion.div key="map" id="panel-map" role="tabpanel" aria-labelledby="tab-map" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <MapTab />
            </motion.div>
          )}

          {active === "stream" && (
            <motion.div key="stream" id="panel-stream" role="tabpanel" aria-labelledby="tab-stream" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <StreamTab />
            </motion.div>
          )}

          {active === "plan" && (
            <motion.div key="plan" id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <PlanTab />
            </motion.div>
          )}

          {active === "moments" && (
            <motion.div key="moments" id="panel-moments" role="tabpanel" aria-labelledby="tab-moments" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <MomentsTab />
            </motion.div>
          )}

          {active === "pulse" && (
            <motion.div key="pulse" id="panel-pulse" role="tabpanel" aria-labelledby="tab-pulse" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <PulseTab />
            </motion.div>
          )}

          {active === "venues" && (
            <motion.div key="venues" id="panel-venues" role="tabpanel" aria-labelledby="tab-venues" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <VenuesTab />
            </motion.div>
          )}

          {active === "analytics" && (
            <motion.div key="analytics" id="panel-analytics" role="tabpanel" aria-labelledby="tab-analytics" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <AnalyticsTab />
            </motion.div>
          )}

          {active === "wing" && (
            <motion.div key="wing" id="panel-wing" role="tabpanel" aria-labelledby="tab-wing" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <WingTab />
            </motion.div>
          )}

          {active === "privacy" && (
            <motion.div key="privacy" id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
              <PrivacyTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}