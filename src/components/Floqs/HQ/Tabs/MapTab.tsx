import React from "react";
import { MapPin, Target, Thermometer, Users, Radio, Layers } from "lucide-react";
import Pill from "../ui/Pill";
import Btn from "../ui/Btn";
import Section from "../ui/Section";

const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", v: 60 },
  { n: "Tom", d: "Downtown • Hype", v: 85 },
  { n: "Alex", d: "Beach→Venice", v: 80 },
  { n: "You", d: "Home • Neutral", v: 45 }
];

type Props = {
  reduce?: boolean;
  halfOpen?: boolean;  
  halfCats?: string[];
  halfSel?: string | null;
  halfAPI?: any;
  halfLoading?: boolean;
  rallyLoading?: boolean;
  toXY?: (p: { lat: number; lng: number }) => { x: number; y: number };
  onMeetHalfway?: () => void;
  onRallyChoice?: (choice: "join" | "maybe" | "decline") => void;
  panelAnim?: any;
};

export default function MapTab({ onMeetHalfway, onRallyChoice, reduce, panelAnim, ...otherProps }: Props) {
  return (
    <div className="space-y-5">
      <Section
        title="Living Proximity Map"
        icon={<MapPin className="h-4 w-4" />}
        right={<Btn glow onClick={onMeetHalfway}>Meet-Halfway</Btn>}
      >
        <div className="relative h-72 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 grid place-items-center text-xs text-white/60">
          (Map preview)
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4 text-[12px] text-white/80">
          <div>You ↔ Sarah: 6 min • Café Nero (2) • Energy 88%</div>
          <div>Meeting point: Optimal • Convergence 94%</div>
          <div>Social Weather: Building energy • Pressure rising</div>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[13px]">
          4 converging at Coffee District · ETA 7:45 • Alignment high • Energy cost low
          <div className="mt-2 flex gap-2">
            <Btn glow onClick={() => onRallyChoice?.("join")}>Join</Btn>
            <Btn onClick={() => onRallyChoice?.("maybe")}>Maybe</Btn>
            <Btn onClick={() => onRallyChoice?.("decline")}>Can't</Btn>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] text-white/70">
          <div className="flex-1 h-1 rounded-full bg-white/10 mx-3" />
          <div className="flex gap-2">
            <Btn aria-label="Targets"><Target className="h-4 w-4" /></Btn>
            <Btn aria-label="Thermals"><Thermometer className="h-4 w-4" /></Btn>
            <Btn aria-label="Members"><Users className="h-4 w-4" /></Btn>
            <Btn aria-label="Pins"><MapPin className="h-4 w-4" /></Btn>
          </div>
        </div>
      </Section>

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
    </div>
  );
}