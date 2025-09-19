import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { MapPin } from "lucide-react";

const VENUES = [
  { r: 1, name: "Gran Blanco", badge: "Energy 94", meta: "Tapas • 2 min walk • Usually busy Thu", note: "Our spot for energy nights" },
  { r: 2, name: "Coffee District", badge: "Chill 88", meta: "Coffee • 5 min walk • Perfect for morning", note: "Best convergence point" },
  { r: 3, name: "Rooftop Lounge", badge: "Vibes 91", meta: "Cocktails • 8 min walk • Great views", note: "Weekend favorite" }
];

export default function VenuesTab() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Btn active>All</Btn><Btn>Day</Btn><Btn>Night</Btn><Btn>Food</Btn><Btn>Bars</Btn><Btn>Activities</Btn>
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
    </>
  );
}