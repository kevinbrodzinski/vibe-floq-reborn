import React from "react";
import { Link } from "react-router-dom";
import { Users, MapPin, Sparkles, Radio } from "lucide-react";
import { Glass } from "@/components/Common/Glass";
import { vibeToGradientClass } from "@/components/Common/vibeTokens";

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

  // Use tokenized vibe gradient
  const vibeGradient = vibeToGradientClass(vibe as any) || vibeToGradientClass();

  return (
    <Link to={`/floqs/${item.id}/hq`} className="block group">
      <Glass className="p-4 hover:bg-white/10 transition-all duration-200 group-hover:border-white/20">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${vibeGradient} shadow-lg grid place-items-center neon-ring`}>
            <Sparkles className="h-5 w-5 text-white drop-shadow-neon" />
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
              className="w-full py-1.5 rounded-lg neon-pill text-[11px] hover:bg-white/15 transition neon-ring"
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
      </Glass>
    </Link>
  );
}