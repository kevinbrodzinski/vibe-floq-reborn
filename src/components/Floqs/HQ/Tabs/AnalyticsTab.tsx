import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Bar from "../ui/Bar";
import { BarChart3, Users, Gauge, Target } from "lucide-react";

export default function AnalyticsTab() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Btn active>Overview</Btn><Btn>Dynamics</Btn><Btn>Patterns</Btn><Btn>Archetypes</Btn><Btn>Export</Btn>
      </div>

      <Section title="Tribe Health" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="text-[13px]">Score 87/100 • Momentum building • 12 convergences</div>
        <div className="mt-2"><Bar value={87} /></div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Your Role" icon={<Users className="h-4 w-4" />}>
          <div className="text-[13px]">Catalyst • Initiate 42% • +15% vibe lift</div>
          <div className="text-[12px] text-white/80">Strongest: You↔Sarah • Needs: You↔Jake</div>
        </Section>
        <Section title="Weekly Rhythm" icon={<Gauge className="h-4 w-4" />}>
          <div className="text-[12px] text-white/80">Mon recovery • Tue build • Wed social • Thu peak • Fri high • Sat var • Sun recharge</div>
          <div className="mt-2 h-20 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white/60 text-xs">(Heatmap)</div>
        </Section>
      </div>

      <Section title="Insights" icon={<Target className="h-4 w-4" />}>
        <div className="grid md:grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            Thu tradition at risk
            <div className="mt-2"><Btn glow>Rally the Crew</Btn></div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            Jake engagement dropping
            <div className="mt-2 flex gap-2"><Btn>Reach Out</Btn><Btn>View Relationship</Btn></div>
          </div>
        </div>
      </Section>
    </div>
  );
}