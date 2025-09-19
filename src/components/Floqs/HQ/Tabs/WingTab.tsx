import React from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare } from "lucide-react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";

interface WingTabProps {
  reduce: boolean;
  panelAnim: any;
}

export function WingTab({ reduce, panelAnim }: WingTabProps) {
  return (
    <motion.div key="wing" id="panel-wing" role="tabpanel" aria-labelledby="tab-wing" {...panelAnim(reduce)} className="space-y-5">
      <Section title="Suggestions" icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">Thursday Tradition at risk<div className="mt-2 flex gap-2"><Btn glow>Create Rally</Btn><Btn>Send Reminder</Btn><Btn>Skip</Btn></div></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">Jake needs attention<div className="mt-2 flex gap-2"><Btn>Suggest 1-on-1</Btn><Btn>Add to next plan</Btn><Btn>Let it be</Btn></div></div>
        </div>
      </Section>
      <Section title="Ask Wingman" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[12px] text-white/60">Try: find common time • best venue for 10 • who hasn't converged • chill Sunday plan</div>
          <div className="mt-3 flex items-center gap-2">
            <input className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40" placeholder="Ask Wingman…" />
            <Btn glow>Send</Btn>
          </div>
        </div>
      </Section>
      <Section title="Chat" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="text-[13px]">You: Find us a new bar to try</div>
        <div className="mt-2 rounded-xl bg-white/5 border border-white/10 p-3 text-[12px] text-white/80">
          <ol className="list-decimal ml-5 space-y-1">
            <li>The Brig — 0.5mi • live music</li>
            <li>Townhouse — dive • pool tables</li>
            <li>Rooftop at Erwin — sunset views</li>
          </ol>
          <div className="mt-2 flex gap-2">
            <Btn>Create Poll</Btn>
            <Btn>Directions</Btn>
            <Btn>More</Btn>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}