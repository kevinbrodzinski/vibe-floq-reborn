import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";
import { Gauge, Users } from "lucide-react";

const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", v: 60 },
  { n: "Tom", d: "Downtown • Hype", v: 85 },
  { n: "Alex", d: "Beach→Venice", v: 80 }
];

export default function PulseTab() {
  return (
    <div className="space-y-5">
      <Section title="Group Pulse" icon={<Gauge className="h-4 w-4" />} right={<Btn glow>Activate Convergence</Btn>}>
        <div className="text-[13px]">High potential • 3 free now • 2 free soon • Optimal: Coffee District</div>
      </Section>

      {PEOPLE.map((p, i) => (
        <Section key={p.n} title={p.n} icon={<Users className="h-4 w-4" />} right={<Pill>{i===0?"Energy 92":i===1?"Energy 45":"Ghost"}</Pill>}>
          <div className="text-[12px] text-white/80">Status details</div>
          <div className="mt-2 grid sm:grid-cols-2 gap-3 text-[12px] text-white/80">
            <div>Location info</div>
            <div>Vibe info</div>
          </div>
        </Section>
      ))}
    </div>
  );
}