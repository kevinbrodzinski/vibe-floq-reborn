import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { Zap, Users, MessageSquare } from "lucide-react";

export default function WingTab() {
  return (
    <>
      <Section title="Wing Mode" icon={<Zap className="h-4 w-4" />} right={<Pill glow>Active</Pill>}>
        <div className="text-[13px]">Auto-suggesting optimal convergence opportunities</div>
        <div className="mt-2 flex gap-2">
          <Btn glow>Smart Boost</Btn>
          <Btn>Configure</Btn>
          <Btn>Pause</Btn>
        </div>
      </Section>
      
      <Section title="Recent Assists" icon={<Users className="h-4 w-4" />}>
        <div className="space-y-2 text-[12px] text-white/80">
          <div>Suggested Gran Blanco for Thursday group → 94% energy match</div>
          <div>Auto-invited Maya to coffee convergence → Perfect timing</div>
          <div>Predicted Sarah's availability window → Successful rally</div>
        </div>
      </Section>
      
      <Section title="Wing Insights" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="text-[12px] text-white/80">
          Your group converges best Thu 8-11pm • Energy peaks at familiar venues • Sarah is the convergence catalyst
        </div>
      </Section>
    </>
  );
}