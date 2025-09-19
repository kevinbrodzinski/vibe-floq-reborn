import React from "react";
import { motion } from "framer-motion";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { Calendar, Clock, MapPin } from "lucide-react";

type Props = {
  reduce: boolean;
  panelAnim: any;
};

export default function PlanTab({ reduce, panelAnim }: Props) {
  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <Section title="Tonight — Thu Sept 12" icon={<Calendar className="h-4 w-4" />} right={<Pill glow>Live Now</Pill>}>
        <div className="text-[13px]">"Thursday Tradition #5" • Now →</div>
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" />
        </div>
        <div className="text-[12px] text-white/80 mt-2">Current: Gran Blanco • Building to peak</div>
      </Section>
      
      <Section title="Next Plan" icon={<Clock className="h-4 w-4" />} right={<Btn glow>Join Plan</Btn>}>
        <div className="text-[13px]">Friday Dinner @ Koi Sushi · 7:30pm</div>
        <div className="text-[12px] text-white/80">Confirmed by 5/8 • Added to calendar</div>
        <div className="mt-2 flex gap-2">
          <Btn glow>I'm In</Btn>
          <Btn>Maybe</Btn>
          <Btn>Can't Make It</Btn>
        </div>
      </Section>

      <Section title="Plan Suggestions" icon={<MapPin className="h-4 w-4" />}>
        <div className="space-y-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-semibold">Saturday Beach Day</div>
            <div className="text-[12px] text-white/80">Perfect weather • 6 interested</div>
            <div className="mt-2 flex gap-2">
              <Btn glow>Create Plan</Btn>
              <Btn>Suggest Changes</Btn>
            </div>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}