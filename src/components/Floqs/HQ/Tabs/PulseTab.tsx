import React from "react";
import { motion } from "framer-motion";
import { Gauge, Users } from "lucide-react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import Pill from "../ui/Pill";

const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", energy: "Energy 92" },
  { n: "Tom", d: "Downtown • Hype", energy: "Energy 45" },
  { n: "Alex", d: "Beach→Venice", energy: "Ghost" },
];

type Props = {
  reduce: boolean;
  panelAnim: any;
  onActivateConvergence?: () => void;
};

export default function PulseTab({ reduce, panelAnim, onActivateConvergence }: Props) {
  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <Section
        title="Group Pulse"
        icon={<Gauge className="h-4 w-4" />}
        right={
          <Btn glow onClick={onActivateConvergence}>
            Activate Convergence
          </Btn>
        }
      >
        <div className="text-[13px]">
          High potential • 3 free now • 2 free soon • Optimal: Coffee District
        </div>
      </Section>

      {PEOPLE.map((p) => (
        <Section
          key={p.n}
          title={p.n}
          icon={<Users className="h-4 w-4" />}
          right={<Pill glow>{p.energy}</Pill>}
        >
          <div className="text-[12px] text-white/80">Status details</div>
          <div className="mt-2 grid sm:grid-cols-2 gap-3 text-[12px] text-white/80">
            <div>Location info</div>
            <div>Vibe info</div>
          </div>
        </Section>
      ))}
    </motion.div>
  );
}