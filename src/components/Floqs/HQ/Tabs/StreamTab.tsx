import React, { useState } from "react";
import { motion } from "framer-motion";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import { Navigation2, Camera, Check } from "lucide-react";

type Props = {
  reduce: boolean;
  panelAnim: any;
  onStartRally?: () => void;
  onSend?: (text: string) => void;
  onRallyResponse?: (id: string, s: "joined" | "maybe" | "declined") => void;
  sending?: boolean;
  rallyLoading?: boolean;
};

export default function StreamTab({ reduce, panelAnim, onStartRally, onSend, onRallyResponse, sending, rallyLoading }: Props) {
  const [msg, setMsg] = useState("");

  const sendNow = () => {
    const val = msg.trim();
    if (!val) return;
    onSend?.(val);
    setMsg("");
  };

  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Btn active>Crew (2)</Btn><Btn>Plans (1)</Btn><Btn>Live</Btn><Btn>Memories</Btn>
        </div>
        <div className="flex gap-2">
          <Btn>Wing</Btn><Btn>Filter</Btn>
          <Btn glow onClick={onStartRally}>{rallyLoading ? "Starting…" : "+ Start Rally"}</Btn>
        </div>
      </div>

      <Section title="Rally" icon={<Navigation2 className="h-4 w-4" />}>
        <div className="text-sm font-medium mb-1">Tom started a Rally · 2m</div>
        <div className="text-[13px] text-white/80 mb-2">@everyone drinks at @GranBlanco in 1 hr?</div>
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-[12px]">
          Rally: Gran Blanco @ 8:30 • Going: 3 • Deciding: 2 • No reply: 3
          <div className="mt-2 flex gap-2">
            <Btn glow onClick={() => onRallyResponse?.("RALLY_ID_PLACEHOLDER","joined")}>Join</Btn>
            <Btn onClick={() => onRallyResponse?.("RALLY_ID_PLACEHOLDER","maybe")}>Maybe</Btn>
            <Btn onClick={() => onRallyResponse?.("RALLY_ID_PLACEHOLDER","declined")}>Can't</Btn>
          </div>
        </div>
      </Section>

      <Section title="Moment" icon={<Camera className="h-4 w-4" />}>
        <div className="text-sm font-medium mb-1">Sarah shared a moment · 12m</div>
        <div className="rounded-xl aspect-[16/9] bg-zinc-900 border border-white/10 grid place-items-center text-white/60 text-xs">photo</div>
      </Section>

      <Section title="Pinned Decision" icon={<Check className="h-4 w-4" />}>
        <div className="text-sm font-semibold">Friday Dinner @ Koi Sushi · 7:30pm</div>
        <div className="text-[12px] text-white/80">Confirmed by 5/8 • Added to calendar</div>
      </Section>

      <div className="rounded-xl border border-white/10 bg-white/5 p-2 flex items-center gap-2">
        <span className="text-[12px] opacity-70">@</span>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendNow()}
          className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
          placeholder="Write a message…"
          aria-label="Message"
        />
        <Btn glow onClick={sendNow}>{sending ? "Sending…" : "Send"}</Btn>
      </div>
    </motion.div>
  );
}