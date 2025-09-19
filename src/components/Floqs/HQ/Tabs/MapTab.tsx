import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { MapPin, Target, Thermometer, Users, Radio, Layers } from "lucide-react";
import SmartMap from "@/components/maps/SmartMap";
import { useHQMeetHalfway } from "@/hooks/useHQMeetHalfway";
import MeetHalfwaySheet from "@/components/floq/MeetHalfwaySheet";

const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", v: 60 },
  { n: "Tom", d: "Downtown • Hype", v: 85 },
  { n: "Alex", d: "Beach→Venice", v: 80 },
  { n: "You", d: "Home • Neutral", v: 45 }
];

type Props = {
  reduce: boolean;
  panelAnim: any;
  onMeetHalfway?: () => void;
  onRallyChoice?: (c: "joined" | "maybe" | "declined") => void;
  floqId?: string;
  meetOpen?: boolean;
};

export default function MapTab({ reduce, panelAnim, onMeetHalfway, onRallyChoice, floqId, meetOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<string[]>(["coffee", "bar", "restaurant"]);
  const [selected, setSelected] = useState<string | null>(null);

  // fetch when sheet is open (your existing API shape)
  const { data, isLoading } = useHQMeetHalfway(floqId, cats, open);

  // default selection when data arrives
  useEffect(() => {
    if (open && data?.candidates?.length && !selected) {
      setSelected(data.candidates[0].id);
    }
  }, [open, data, selected]);

  const toggle = (c: string) =>
    setCats(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <Section
        title="Living Proximity Map"
        icon={<MapPin className="h-4 w-4" />}
        right={<Btn glow onClick={() => setOpen(true)}>Meet-Halfway</Btn>}
      >
        <div className="rounded-xl bg-white/5 border border-white/10 h-[260px] grid place-items-center text-white/40">
          (Map preview)
        </div>
        <div className="text-[12px] text-white/80 mt-3">
          You ↔ Sarah: 6 min • Café Nero (2) • Energy 88%
        </div>
        <div className="text-[12px] text-white/80">Meeting point: Optimal • Convergence 94%</div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[13px]">
          4 converging at Coffee District · ETA 7:45 • Alignment high • Energy cost low
          <div className="mt-2 flex gap-2">
            <Btn glow onClick={() => onRallyChoice?.("joined")}>Join</Btn>
            <Btn onClick={() => onRallyChoice?.("maybe")}>Maybe</Btn>
            <Btn onClick={() => onRallyChoice?.("declined")}>Can't</Btn>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-white/70">
          <div className="flex-1 h-1 rounded-full bg-white/10 mx-3" />
          <div className="flex gap-2">
            <Btn aria-label="Targets"><Target className="h-3.5 w-3.5" /></Btn>
            <Btn aria-label="Thermals"><Thermometer className="h-3.5 w-3.5" /></Btn>
            <Btn aria-label="Members"><Users className="h-3.5 w-3.5" /></Btn>
            <Btn aria-label="Pins"><MapPin className="h-3.5 w-3.5" /></Btn>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Live Status" icon={<Radio className="h-3.5 w-3.5" />}>
          <div className="space-y-3 text-[13px]">
            {PEOPLE.map(p => (
              <div key={p.n} className="flex items-center justify-between">
                <div className="text-white/90">{p.n} <span className="text-white/60">• {p.d}</span></div>
                <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" style={{width:`${p.v}%`}} />
                </div>
              </div>
            ))}
          </div>
        </Section>
        
        <Section title="Smart Layers" icon={<Layers className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>Venues (warm/cool)</div>
            <div>Energy fields</div>
            <div className="opacity-70">Friend floqs</div>
            <div className="opacity-70">Events</div>
          </div>
        </Section>
      </div>

      {/* Sheet */}
      <MeetHalfwaySheet
        open={open}
        onOpenChange={setOpen}
        data={data}
        selectedId={selected}
        onSelectVenue={setSelected}
        categories={cats}
        onToggleCategory={toggle}
        onRallyHere={() => {/* Rally creation logic here */}}
        loading={isLoading}
      />
    </motion.div>
  );
}