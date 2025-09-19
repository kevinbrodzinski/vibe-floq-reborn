import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { MapPin } from "lucide-react";

const VENUES = [
  { r: 1, name: "Gran Blanco", badge: "Home Base", meta: "Thursday HQ • 47 visits • Perfect energy", note: "Where legends are made" },
  { r: 2, name: "Koi Sushi", badge: "Dinner Spot", meta: "Premium choice • 12 visits • Intimate vibes", note: "Always delivers" },
  { r: 3, name: "Venice Beach", badge: "Adventure", meta: "Weekend favorite • 8 visits • High energy", note: "Epic moments happen here" }
];

export default function VenuesTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Btn active>All</Btn>
          <Btn>Day</Btn>
          <Btn>Night</Btn>
          <Btn>Food</Btn>
          <Btn>Bars</Btn>
          <Btn>Activities</Btn>
        </div>
        <Btn>All Time</Btn>
      </div>

      <Section title="Our Top Spots" icon={<MapPin className="h-4 w-4" />}>
        {VENUES.map(v => (
          <div key={v.r} className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{v.r}. {v.name}</div>
              <Pill glow>{v.badge}</Pill>
            </div>
            <div className="text-[12px] text-white/70">{v.meta}</div>
            <div className="text-[12px] text-white/80 mt-1 italic">"{v.note}"</div>
            <div className="mt-2 flex gap-2">
              <Btn glow>Navigate</Btn>
              <Btn glow>Rally Here</Btn>
              <Btn>History</Btn>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}