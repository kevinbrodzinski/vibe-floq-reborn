import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Bar from "../ui/Bar";
import { BarChart3, TrendingUp } from "lucide-react";

export default function AnalyticsTab() {
  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <Btn active>Overview</Btn>
        <Btn>Dynamics</Btn>
        <Btn>Patterns</Btn>
        <Btn>Insights</Btn>
        <Btn>Reports</Btn>
      </div>

      <Section title="Tribe Health" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="text-2xl font-bold">94<span className="text-lg text-white/60">/100</span></div>
        <Bar value={94} />
        <div className="text-[12px] text-white/70 mt-2">Excellent convergence • High energy alignment • Strong social bonds</div>
      </Section>

      <Section title="Your Role" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="text-[13px]">Social Catalyst • High influence • Connector type</div>
        <div className="text-[12px] text-white/70">You initiate 47% of gatherings • Bridge different groups • Natural rally starter</div>
      </Section>

      <Section title="Weekly Rhythm" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="text-[12px] font-mono leading-relaxed">
          M T W <span className="font-bold text-white">T</span> F S <span className="font-bold text-white">S</span><br />
          . . . ███ . ██ ██<br />
          Thu: Thursday Tradition<br />
          Sat-Sun: Adventure time
        </div>
      </Section>

      <Section title="Insights" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="text-[13px]">Thursday streak at risk • Consider backup venue</div>
        <div className="mt-2 flex gap-2">
          <Btn glow>Setup Backup</Btn>
          <Btn>Ignore</Btn>
        </div>
      </Section>
    </div>
  );
}