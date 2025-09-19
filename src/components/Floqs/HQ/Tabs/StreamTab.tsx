import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Section from "../ui/Section";
import Btn from "../ui/Btn";
import { useSmartStream, useMarkStreamSeen, useStreamRealtime } from "@/hooks/useSmartStream";
import { SmartFilter, SmartItem } from "@/types/stream";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  useEffect(() => { if (validId) markSeen.mutate({}); }, [validId, markSeen]);
  useEffect(() => {
    if (!validId) return;
    const onFocus = () => markSeen.mutate({});
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
            <button 
              type="button"
              className={`chip-compact ${filter === "wings" ? "aura-sm" : ""}`} 
              data-active={filter === "wings"}
              onClick={() => setFilter("wings")}
            >
              Wings
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
  // Wings Cards
  if (item.kind === "wings_poll") {
    return <PollCard item={item} />;
  }
  if (item.kind === "wings_time") {
    return <TimePickerCard item={item} />;
  }
  if (item.kind === "wings_meet") {
    return <MeetHalfwayCard item={item} />;
  }
  if (item.kind === "venue_suggestion") {
    return <VenueSuggestionCard item={item} />;
  }
  
  // Rally content
  if (item.kind === "rally") {
    const { note, minutes_until_expiry, venue_id, scope } = item.meta || {};
    const isExpiringSoon = minutes_until_expiry <= 90 && minutes_until_expiry > 0;
    const isExpired = minutes_until_expiry <= 0;
    
    return (
      <div className={`glass-subtle p-3 rounded-xl border ${isExpiringSoon ? 'border-orange-500/30' : 'border-white/10'}`}>
        <div className="text-white/90 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            Rally
            <span className={`text-xs px-2 py-1 rounded ${scope === 'field' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
              {scope === 'field' ? 'Field' : 'Floq'}
            </span>
          </div>
          {isExpiringSoon && (
            <span className="text-xs text-orange-400">
              {minutes_until_expiry}m left
            </span>
          )}
        </div>
        {note && (
          <div className="text-white/75 text-sm mt-1">{note}</div>
        )}
        {!isExpired && (
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
        )}
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
      <div className="text-white/85 text-sm">{item.body ?? "Message"}</div>
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

/* AI Card Components */
function PollCard({ item }: { item: SmartItem }) {
  const qc = useQueryClient();
  const { title, options, expires_at } = item.meta?.payload || {};
  const [voting, setVoting] = useState(false);

  const vote = async (idx: number) => {
    if (voting) return;
    setVoting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      await supabase.from("floq_wings_votes").upsert({ 
        event_id: item.id, 
        profile_id: user.id,
        option_idx: idx 
      });
      qc.invalidateQueries({ queryKey: ["smart-stream"] });
    } catch (error) {
      console.error("Vote failed:", error);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium flex items-center gap-2">
        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Wings</span>
        {title || "Quick poll"}
      </div>
      {item.meta?.confidence && (
        <div className="text-xs text-white/50 mt-1">
          AI detected: {Math.round(item.meta.confidence * 100)}% confidence
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {(options || ["Yes", "No"]).map((opt: string, i: number) => (
          <Btn 
            key={i} 
            type="button"
            className="w-full text-left justify-start" 
            onClick={() => vote(i)} 
            disabled={voting}
          >
            {opt}
          </Btn>
        ))}
      </div>
      {expires_at && (
        <div className="text-[11px] text-white/50 mt-2">
          Expires {new Date(expires_at).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function TimePickerCard({ item }: { item: SmartItem }) {
  const qc = useQueryClient();
  const { title, slots, tz } = item.meta?.payload || {};
  const [voting, setVoting] = useState(false);

  const pickTime = async (timeSlot: string) => {
    if (voting) return;
    setVoting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      await supabase.from("floq_wings_votes").upsert({ 
        event_id: item.id, 
        profile_id: user.id,
        option_idx: (slots || []).indexOf(timeSlot)
      });
      qc.invalidateQueries({ queryKey: ["smart-stream"] });
    } catch (error) {
      console.error("Time pick failed:", error);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium flex items-center gap-2">
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Wings</span>
        {title || "When works?"}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(slots || ["7:00", "7:30", "8:00"]).map((slot: string) => (
          <Btn 
            key={slot} 
            type="button"
            className="text-center" 
            onClick={() => pickTime(slot)} 
            disabled={voting}
          >
            {slot}
          </Btn>
        ))}
      </div>
      {tz && (
        <div className="text-[11px] text-white/50 mt-2">
          Times in {tz}
        </div>
      )}
    </div>
  );
}

function MeetHalfwayCard({ item }: { item: SmartItem }) {
  const { suggested_venues, window } = item.meta?.payload || {};

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium flex items-center gap-2">
        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Wings</span>
        Meet halfway
      </div>
      <div className="text-white/70 text-sm mt-1">
        Suggested meeting spots within {window || "1h"}
      </div>
      <div className="mt-3 space-y-2">
        {(suggested_venues || []).slice(0, 3).map((venue: any, i: number) => (
          <Btn 
            key={i} 
            type="button"
            className="w-full text-left justify-start" 
            variant="primary"
            glow
          >
            Rally at {venue.name}
          </Btn>
        ))}
      </div>
    </div>
  );
}

function VenueSuggestionCard({ item }: { item: SmartItem }) {
  const { venues, context } = item.meta?.payload || {};

  return (
    <div className="glass-subtle p-3 rounded-xl border border-white/10">
      <div className="text-white/90 font-medium flex items-center gap-2">
        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Wings</span>
        {item.title ?? "Venue suggestions"}
      </div>
      {context && (
        <div className="text-white/70 text-sm mt-1">{context}</div>
      )}
      <div className="mt-3 space-y-2">
        {(venues || []).slice(0, 2).map((venue: any, i: number) => (
          <Btn 
            key={i} 
            type="button"
            className="w-full text-left justify-start"
          >
            {venue.name}
          </Btn>
        ))}
      </div>
    </div>
  );
}