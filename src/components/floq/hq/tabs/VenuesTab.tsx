import React from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Section, Btn, Pill } from "../shared/components";
import { VENUES } from "../shared/constants";

interface VenuesTabProps {
  reduce: boolean;
  panelAnim: any;
}

export function VenuesTab({ reduce, panelAnim }: VenuesTabProps) {
  return (
    <motion.div key="venues" id="panel-venues" role="tabpanel" aria-labelledby="tab-venues" {...panelAnim(reduce)} className="space-y-5">
      <div className="flex items-center justify-between"><div className="flex gap-2 flex-wrap"><Btn active>All</Btn><Btn>Day</Btn><Btn>Night</Btn><Btn>Food</Btn><Btn>Bars</Btn><Btn>Activities</Btn></div><Btn>All Time</Btn></div>
      <Section title="Our Top Spots" icon={<MapPin className="h-4 w-4" />}>
        {VENUES.map(v=> (
          <div key={v.r} className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3"><div className="flex items-center justify-between"><div className="text-sm font-semibold">{v.r}. {v.name}</div><Pill glow>{v.badge}</Pill></div><div className="text-[12px] text-white/70">{v.meta}</div><div className="text-[12px] text-white/80 mt-1 italic">"{v.note}"</div><div className="mt-2 flex gap-2"><Btn glow>Navigate</Btn><Btn glow>Rally Here</Btn><Btn>History</Btn></div></div>
        ))}
      </Section>
    </motion.div>
  );
}