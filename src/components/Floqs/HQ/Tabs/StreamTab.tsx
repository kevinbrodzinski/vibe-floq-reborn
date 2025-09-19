import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import { useSmartStream, useMarkStreamSeen, useStreamRealtime, SmartFilter, SmartItem } from "@/hooks/useSmartStream";

type Props = {
  reduce: boolean;
  panelAnim: any;
  floqId?: string;
  onStartRally?: () => void;
  onSend?: (text: string) => void;
  onRallyResponse?: (id: string, s: "joined" | "maybe" | "declined") => void;
  sending?: boolean;
  rallyLoading?: boolean;
};

export default function StreamTab({ reduce, panelAnim, floqId, onStartRally, onSend, onRallyResponse, sending, rallyLoading }: Props) {
  const [filter, setFilter] = useState<SmartFilter>("all");
  const [lastSeenTs, setLastSeenTs] = useState<string | null>(null);
  const validId = !!floqId;
  const { data, isLoading } = useSmartStream(floqId ?? "", filter, lastSeenTs);
  const markSeen = useMarkStreamSeen(floqId ?? "", (ts) => setLastSeenTs(ts));
  useStreamRealtime(floqId ?? "");

  // mark seen when tab becomes visible and on mount
  useEffect(() => { if (validId) markSeen.mutate(); }, [validId, markSeen]);
  useEffect(() => {
    if (!validId) return;
    const onFocus = () => markSeen.mutate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [validId, markSeen]);

  const unread = data?.unread_count ?? 0;
  const items = data?.items ?? [];

  return (
    <motion.div {...panelAnim(reduce)} className="space-y-5">
      <Section
        title="Stream"
        right={
          <Btn 
            type="button" 
            variant="primary" 
            glow 
            onClick={() => onStartRally?.()}
          >
            {rallyLoading ? "Starting…" : "+ Start Rally"}
          </Btn>
        }
        className="aura"
      >
        {/* Compact filter row */}
        <div className="-mx-4 px-4 flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button 
              type="button"
              className={`chip-compact ${filter === "all" ? "aura-sm" : ""}`} 
              data-active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button 
              type="button"
              className={`chip-compact ${filter === "unread" ? "aura-sm" : ""}`} 
              data-active={filter === "unread"}
              onClick={() => setFilter("unread")}
            >
              Unread {unread > 0 && `(${unread})`}
            </button>
            <button 
              type="button"
              className={`chip-compact ${filter === "rally" ? "aura-sm" : ""}`} 
              data-active={filter === "rally"}
              onClick={() => setFilter("rally")}
            >
              Rally
            </button>
            <button 
              type="button"
              className={`chip-compact ${filter === "photos" ? "aura-sm" : ""}`} 
              data-active={filter === "photos"}
              onClick={() => setFilter("photos")}
            >
              Photos
            </button>
            <button 
              type="button"
              className={`chip-compact ${filter === "plans" ? "aura-sm" : ""}`} 
              data-active={filter === "plans"}
              onClick={() => setFilter("plans")}
            >
              Plans
            </button>
          </div>
          <button type="button" className="chip-compact">⚙︎</button>
        </div>

        {/* Mixed list */}
        <div className="mt-3 space-y-3">
          {isLoading && <div className="text-white/70 text-sm">Loading…</div>}
          {!isLoading && items.length === 0 && <div className="text-white/70 text-sm">Nothing new.</div>}

          {items.map((item: SmartItem) => (
            <SmartItemRow key={item.id} item={item} onRallyResponse={onRallyResponse} />
          ))}
        </div>

        {/* Compact composer - use existing onSend callback */}
        <div className="mt-3 glass-subtle p-2 rounded-xl border border-white/10 flex items-center gap-2">
          <button 
            type="button" 
            className="chip-compact aura-sm" 
            onClick={() => {/* attach */}}
          >
            ＋
          </button>
          <ComposerInput onSend={onSend} sending={sending} />
        </div>
      </Section>
    </motion.div>
  );
}

/* Renders each kind using the existing card styles */
function SmartItemRow({ 
  item, 
  onRallyResponse 
}: { 
  item: SmartItem;
  onRallyResponse?: (id: string, s: "joined" | "maybe" | "declined") => void;
}) {
  if (item.kind === "rally") {
    return (
      <div className="glass-subtle p-3 rounded-xl border border-white/10">
        <div className="text-white/90 font-medium">{item.title}</div>
        <div className="text-white/75 text-sm mt-1">
          Rally: {item.rally?.venue} @ {item.rally?.at ? new Date(item.rally.at).toLocaleTimeString() : "TBD"}
        </div>
        <div className="mt-2 flex gap-2">
          <Btn 
            type="button" 
            variant="primary" 
            glow 
            onClick={() => onRallyResponse?.(item.id, "joined")}
          >
            Join
          </Btn>
          <Btn 
            type="button" 
            onClick={() => onRallyResponse?.(item.id, "maybe")}
          >
            Maybe
          </Btn>
          <Btn 
            type="button" 
            onClick={() => onRallyResponse?.(item.id, "declined")}
          >
            Can't
          </Btn>
        </div>
      </div>
    );
  }
  if (item.kind === "moment") {
    return (
      <div className="glass-subtle p-3 rounded-xl border border-white/10">
        <div className="text-white/90 font-medium">{item.title ?? "Moment"}</div>
        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 h-40 bg-white/5 grid place-items-center text-white/60 text-xs">
          {/* show item.media thumbs here */}
          photo
        </div>
      </div>
    );
  }
  if (item.kind === "plan") {
    return (
      <div className="glass-subtle p-3 rounded-xl border border-white/10">
        <div className="text-white/90 font-medium">{item.plan?.title}</div>
        <div className="text-white/70 text-sm mt-1">Status: {item.plan?.status}</div>
      </div>
    );
  }
  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/85 text-sm">{item.body}</div>
    </div>
  );
}

function ComposerInput({ onSend, sending }: { onSend?: (text: string) => void; sending?: boolean }) {
  const [text, setText] = useState("");

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    onSend?.(text.trim());
    setText("");
  };

  return (
    <>
      <input
        className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
        placeholder="Share with the crew…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await sendMessage();
          }
        }}
      />
      <Btn 
        type="button"
        variant="primary" 
        glow 
        disabled={!text.trim() || sending}
        onClick={sendMessage}
      >
        {sending ? "Sending…" : "Send"}
      </Btn>
    </>
  );
}