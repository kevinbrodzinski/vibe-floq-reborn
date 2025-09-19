import React from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare } from "lucide-react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";

type Props = {
  reduce: boolean;
  panelAnim: any;
  onCreateRally?: () => void;
};

export default function WingTab({ reduce, panelAnim, onCreateRally }: Props) {
  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <Section title="Suggestions" icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">
            Thursday Tradition at risk
            <div className="mt-2 flex gap-2">
              <Btn glow onClick={onCreateRally}>Create Rally</Btn>
              <Btn>Send Reminder</Btn>
              <Btn>Skip</Btn>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">
            Jake needs attention
            <div className="mt-2 flex gap-2">
              <Btn>Suggest 1-on-1</Btn>
              <Btn>Add to next plan</Btn>
              <Btn>Let it be</Btn>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Ask Wingman" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-[12px] text-white/60">
            Try: find common time • best venue for 10 • who hasn't converged • chill Sunday plan
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40" placeholder="Ask Wingman…" />
            <button className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/10 text-[12px] btn-glow">
              Send
            </button>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}