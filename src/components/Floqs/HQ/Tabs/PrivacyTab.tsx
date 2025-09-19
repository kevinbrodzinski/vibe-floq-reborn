import React from "react";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import { Shield } from "lucide-react";

export default function PrivacyTab() {
  return (
    <>
      <Section title="Privacy Controls" icon={<Shield className="h-4 w-4" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["Precise","Neighborhood","Status Only","Ghost"].map(l => (
            <Btn key={l}>{l}</Btn>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-white/60">
          Auto-rules: Ghost after 11pm • Precise during rallies • Status at work
        </div>
      </Section>
    </>
  );
}