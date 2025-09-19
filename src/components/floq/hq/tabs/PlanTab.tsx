import React from "react";
import { motion } from "framer-motion";
import { Check, CalendarCheck } from "lucide-react";
import { Section, Btn, Pill } from "../shared/components";

interface PlanTabProps {
  reduce: boolean;
  panelAnim: any;
}

export function PlanTab({ reduce, panelAnim }: PlanTabProps) {
  return (
    <motion.div key="plan" id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" {...panelAnim(reduce)} className="space-y-5">
      <div className="flex flex-wrap gap-2"><Btn glow>+ Solo Plan</Btn><Btn glow>+ Group Plan</Btn><Btn>View Calendar</Btn><Btn>Wingman Help</Btn></div>
      <Section title="Thursday Tradition @ Gran" icon={<Check className="h-4 w-4" />} right={<Pill glow>Locked</Pill>}><div className="text-[13px]">8:30pm • 6/8 confirmed • Recurring weekly</div><div className="text-[12px] text-white/70">Energy: Social-Hype • Friction: Low</div></Section>
      <Section title="Dinner @ Koi Sushi" icon={<CalendarCheck className="h-4 w-4" />} right={<Pill glow>Building</Pill>}><div className="text-[13px]">7:30pm • 5 confirmed, 2 pending · Organizer: Sarah</div><div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[12px]">Live Planning: 3 active • "I can pick up Tom and Alex" • "Jake is vegetarian"</div></Section>
      <Section title="Beach Day" icon={<CalendarCheck className="h-4 w-4" />} right={<Pill glow>Tentative</Pill>}><div className="text-[13px]">All day • Flexible • Weather dependent</div><div className="text-[12px] text-white/70">Forecast: Perfect • Backup: Indoor climbing</div></Section>
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-[13px]">Suggested by Wingman: Sunday Brunch? 4 usually free<div className="mt-2 flex gap-2"><Btn glow>Create Plan</Btn><Btn>Not This Week</Btn><Btn>Never Suggest</Btn></div></div>
    </motion.div>
  );
}