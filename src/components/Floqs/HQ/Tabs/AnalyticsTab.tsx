import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import Bar from "../ui/Bar";
import { BarChart3, TrendingUp } from "lucide-react";

export default function AnalyticsTab() {
  return (
    <>
      <Section title="This Week" icon={<BarChart3 className="h-4 w-4" />} right={<Pill glow>+23% vs last</Pill>}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">12</div>
            <div className="text-[11px] text-white/60">Convergences</div>
          </div>
          <div>
            <div className="text-2xl font-bold">94%</div>
            <div className="text-[11px] text-white/60">Success Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold">4.8</div>
            <div className="text-[11px] text-white/60">Avg Energy</div>
          </div>
        </div>
      </Section>
      
      <Section title="Energy Trends" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[12px] mb-1">
              <span>Thursday Nights</span>
              <span>94%</span>
            </div>
            <Bar value={94} />
          </div>
          <div>
            <div className="flex justify-between text-[12px] mb-1">
              <span>Weekend Mornings</span>
              <span>67%</span>
            </div>
            <Bar value={67} />
          </div>
          <div>
            <div className="flex justify-between text-[12px] mb-1">
              <span>Weekday Coffee</span>
              <span>78%</span>
            </div>
            <Bar value={78} />
          </div>
        </div>
      </Section>
      
      <div className="text-[12px] text-white/80">
        Best convergence time: Thu 8-11pm • Optimal venue: Gran Blanco
      </div>
    </>
  );
}