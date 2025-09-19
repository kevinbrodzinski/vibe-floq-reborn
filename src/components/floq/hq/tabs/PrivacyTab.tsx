import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Section, Btn } from "../shared/components";

interface PrivacyTabProps {
  reduce: boolean;
  panelAnim: any;
}

export function PrivacyTab({ reduce, panelAnim }: PrivacyTabProps) {
  return (
    <motion.div key="privacy" id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy" {...panelAnim(reduce)} className="space-y-5">
      <Section title="Privacy Controls" icon={<Shield className="h-4 w-4" />}><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{["Precise","Neighborhood","Status Only","Ghost"].map(l=>(<Btn key={l}>{l}</Btn>))}</div><div className="mt-2 text-[11px] text-white/60">Auto-rules: Ghost after 11pm • Precise during rallies • Status at work</div></Section>
    </motion.div>
  );
}