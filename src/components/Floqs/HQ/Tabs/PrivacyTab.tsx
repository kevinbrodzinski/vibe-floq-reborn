import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import Section from "../ui/Section";

type Props = {
  reduce: boolean;
  panelAnim: any;
  onSelect?: (level: "Precise" | "Neighborhood" | "Status Only" | "Ghost") => void;
};

export default function PrivacyTab({ reduce, panelAnim, onSelect }: Props) {
  const levels: Array<"Precise" | "Neighborhood" | "Status Only" | "Ghost"> = [
    "Precise", "Neighborhood", "Status Only", "Ghost"
  ];

  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <Section title="Privacy Controls" icon={<Shield className="h-4 w-4" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {levels.map(l => (
            <button
              key={l}
              onClick={() => onSelect?.(l)}
              className="rounded-xl border border-white/10 bg-white/5 py-2 text-[12px] hover:bg-white/10 chip-glow"
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-white/60">
          Auto-rules: Ghost after 11pm • Precise during rallies • Status at work
        </div>
      </Section>
    </motion.div>
  );
}