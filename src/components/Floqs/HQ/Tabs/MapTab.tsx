import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { MapPin, Target, Thermometer, Users } from "lucide-react";

export default function MapTab({
  onMeetHalfway,
  onRallyChoice,
}: {
  onMeetHalfway?: () => void;
  onRallyChoice?: (c: "join" | "maybe" | "decline") => void;
}) {
  return (
    <>
      <Section
        title="Living Proximity Map"
        icon={<MapPin className="h-4 w-4" />}
        right={<Btn glow onClick={onMeetHalfway}>Meet-Halfway</Btn>}
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
            <Btn glow onClick={() => onRallyChoice?.("join")}>Join</Btn>
            <Btn onClick={() => onRallyChoice?.("maybe")}>Suggest</Btn>
            <Btn onClick={() => onRallyChoice?.("decline")}>Ignore</Btn>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-white/70">
          <div className="flex-1 h-1 rounded-full bg-white/10 mx-3" />
          <div className="flex gap-2">
            <Btn><Target className="h-4 w-4" /></Btn>
            <Btn><Thermometer className="h-4 w-4" /></Btn>
            <Btn><Users className="h-4 w-4" /></Btn>
            <Btn><MapPin className="h-4 w-4" /></Btn>
          </div>
        </div>
      </Section>
    </>
  );
}