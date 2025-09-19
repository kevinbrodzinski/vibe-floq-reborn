import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { Camera, Star } from "lucide-react";

export default function MomentsTab() {
  return (
    <>
      <Section title="Tonight — Thu Sept 12" icon={<Camera className="h-4 w-4" />} right={<Pill glow>Live Now</Pill>}>
        <div className="text-[13px]">"Thursday Tradition #5" • Now →</div>
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" />
        </div>
        <div className="text-[12px] text-white/80 mt-2">Current: Gran Blanco • Building to peak</div>
      </Section>
      
      <Section title="Last Thursday — Sept 5" icon={<Star className="h-4 w-4" />} right={<Pill glow>Score 5/5</Pill>}>
        <div className="text-[13px]">"Legendary Karaoke Night" • 4h 13m</div>
        <div className="text-[12px] text-white/80">Highlights: Rap battle win • 27 moments • Convergence 94/100</div>
      </Section>
      
      <Section title="Aug 28 — Beach Birthday Bash" icon={<Star className="h-4 w-4" />} right={<Pill glow>Score 4/5</Pill>}>
        <div className="text-[13px]">8/8 attended • 6h • Perfect weather</div>
      </Section>
      
      <div className="text-[12px] text-white/80">Pattern: Thursday Tradition (5 weeks)</div>
    </>
  );
}