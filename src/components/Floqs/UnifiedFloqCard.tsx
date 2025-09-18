import React from "react";
import { Link } from "react-router-dom";
import { Users, MapPin, Sparkles, Radio } from "lucide-react";

type FloqItem = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  member_count?: number;
  live_count?: number;
  primary_vibe?: string;
  privacy?: string;
  created_at?: string;
};

type Props = {
  item: FloqItem;
  showJoinButton?: boolean;
};

export default function UnifiedFloqCard({ item, showJoinButton = false }: Props) {
  const name = item.name || item.title || "Untitled Floq";
  const memberCount = item.member_count || 0;
  const liveCount = item.live_count || 0;
  const vibe = item.primary_vibe || "social";
  const isPrivate = item.privacy === "invite";

  // Simple vibe-to-gradient mapping
  const vibeGradient = {
    social: "from-blue-500 via-purple-500 to-pink-500",
    chill: "from-green-400 via-teal-500 to-blue-500", 
    active: "from-orange-500 via-red-500 to-pink-500",
    hype: "from-fuchsia-500 via-purple-500 to-violet-500",
    productive: "from-emerald-500 via-teal-500 to-cyan-500",
    quiet: "from-slate-400 via-gray-500 to-zinc-500",
  }[vibe.toLowerCase()] || "from-violet-500 via-fuchsia-500 to-rose-500";

  return (
    <Link to={`/floqs/${item.id}/hq`} className="block group">
      <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 hover:bg-white/10 transition-all duration-200 group-hover:border-white/20">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${vibeGradient} shadow-lg grid place-items-center`}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/60">
            {isPrivate && <span>🔒</span>}
            {liveCount > 0 && (
              <div className="flex items-center gap-1">
                <Radio className="h-3 w-3" />
                <span>{liveCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <h3 className="text-[13px] font-semibold text-white/90 mb-1 line-clamp-1">{name}</h3>
          {item.description && (
            <p className="text-[11px] text-white/60 line-clamp-2">{item.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-white/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{memberCount}</span>
            </div>
            <div className="capitalize">{vibe}</div>
          </div>
          {item.created_at && (
            <div>{new Date(item.created_at).toLocaleDateString()}</div>
          )}
        </div>

        {showJoinButton && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <button 
              type="button"
              className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] hover:bg-white/10 transition"
              onClick={(e) => {
                e.preventDefault();
                // Handle join logic here
                console.log('Join floq:', item.id);
              }}
            >
              {isPrivate ? 'Request to Join' : 'Join Floq'}
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}