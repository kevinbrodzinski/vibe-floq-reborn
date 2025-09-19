import React from "react";
import { Link } from "react-router-dom";
import { 
  Users, Activity, MapPin, Timer, ChevronRight, Rocket, 
  MessageSquare, Calendar, Navigation, Eye, Star, Clock,
  Zap, Radio, Shield
} from "lucide-react";
import { Glass } from "@/components/Common/Glass";
import { vibeToGradientClass, vibeToTextClass } from "@/components/Common/vibeTokens";

export type FloqKind = "friend" | "club" | "business" | "momentary";

export type LivingFloqData = {
  id: string;
  name: string;
  description?: string;
  kind: FloqKind;
  vibe?: string;
  privacy?: string;
  
  // Membership & Activity
  members?: number;
  activeNow?: number;
  convergenceNearby?: number;
  
  // Energy & Engagement
  energy?: number; // 0-1
  activityScore?: number; // 0-100
  
  // Contextual Data
  next?: { label: string; when: string };
  ttlSeconds?: number; // For momentary events
  distanceLabel?: string;
  
  // Type-specific data
  matchPct?: number; // For clubs
  following?: boolean; // For businesses
  streakWeeks?: number; // For friend groups
  
  // Real-time indicators
  lastActivity?: string;
  trendingUp?: boolean;
  recentMessages?: number;
  
  created_at?: string;
};

type Props = {
  data: LivingFloqData;
  onOpen: (id: string) => void;
  onPrimary?: (id: string) => void;
  onSecondary?: (id: string) => void;
  showJoinButton?: boolean;
};

function ActivityPulse({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-neon-social/30 animate-ping" />
      <div className="relative h-2 w-2 rounded-full bg-neon-social shadow-[0_0_8px_theme(colors.neon.social)]" />
    </div>
  );
}

function TTLRing({ seconds }: { seconds: number }) {
  const progress = Math.max(0, Math.min(1, seconds / 3600)); // Max 1 hour
  const strokeDasharray = 2 * Math.PI * 12; // radius = 12
  const strokeDashoffset = strokeDasharray * (1 - progress);
  
  return (
    <div className="relative h-8 w-8">
      <svg className="absolute inset-0 -rotate-90" width="32" height="32">
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth="2"
        />
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="hsl(var(--neon-social))"
          strokeWidth="2"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="shadow-[0_0_8px_theme(colors.neon.social)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[10px] text-white/80 font-medium">
          {Math.max(1, Math.floor(seconds / 60))}m
        </span>
      </div>
    </div>
  );
}

function EnergyBar({ energy, vibe }: { energy: number; vibe: string }) {
  const width = `${Math.round(energy * 100)}%`;
  const vibeGradient = vibeToGradientClass(vibe as any);
  
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div 
        className={`h-full bg-gradient-to-r ${vibeGradient} transition-all duration-500`}
        style={{ width }}
      />
    </div>
  );
}

function KindBadge({ kind, data }: { kind: FloqKind; data: LivingFloqData }) {
  switch (kind) {
    case "friend":
      return data.streakWeeks ? (
        <span className="neon-pill px-2 py-0.5 text-[10px] bg-neon-social/20 text-neon-social border border-neon-social/30">
          {data.streakWeeks}w streak
        </span>
      ) : null;
      
    case "club":
      return typeof data.matchPct === "number" ? (
        <span className="neon-pill px-2 py-0.5 text-[10px] bg-neon-productive/20 text-neon-productive border border-neon-productive/30">
          {Math.round(data.matchPct * 100)}% match
        </span>
      ) : null;
      
    case "business":
      return data.following ? (
        <span className="neon-pill px-2 py-0.5 text-[10px] bg-neon-active/20 text-neon-active border border-neon-active/30">
          Following
        </span>
      ) : null;
      
    case "momentary":
      return data.ttlSeconds ? <TTLRing seconds={data.ttlSeconds} /> : null;
      
    default:
      return null;
  }
}

function getKindIcon(kind: FloqKind) {
  switch (kind) {
    case "friend": return Users;
    case "club": return Star;
    case "business": return Navigation;
    case "momentary": return Zap;
    default: return Users;
  }
}

function getContextualActions(kind: FloqKind) {
  switch (kind) {
    case "friend":
      return [
        { icon: Rocket, label: "Rally", variant: "primary" as const },
        { icon: MessageSquare, label: "Chat", variant: "secondary" as const }
      ];
    case "club":
      return [
        { icon: Calendar, label: "RSVP", variant: "primary" as const },
        { icon: Eye, label: "Preview", variant: "secondary" as const }
      ];
    case "business":
      return [
        { icon: Activity, label: "Updates", variant: "primary" as const },
        { icon: Navigation, label: "Navigate", variant: "secondary" as const }
      ];
    case "momentary":
      return [
        { icon: Zap, label: "Join now", variant: "primary" as const },
        { icon: Timer, label: "Remind me", variant: "secondary" as const }
      ];
    default:
      return [];
  }
}

export default function LivingFloqCard({ 
  data, 
  onOpen, 
  onPrimary, 
  onSecondary, 
  showJoinButton = false 
}: Props) {
  const {
    id, name, description, kind, vibe = "social", privacy,
    members = 0, activeNow = 0, energy = 0.5, convergenceNearby = 0,
    next, distanceLabel, trendingUp, recentMessages = 0
  } = data;

  const isPrivate = privacy === "invite";
  const vibeGradient = vibeToGradientClass(vibe as any);
  const KindIcon = getKindIcon(kind);
  const actions = getContextualActions(kind);

  return (
    <article className="group">
      <Link to={`/floqs/${id}/hq`} className="block">
        <Glass className="p-4 hover:bg-white/8 transition-all duration-300 group-hover:border-white/20 group-hover:shadow-glass-hover">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`relative h-10 w-10 rounded-lg bg-gradient-to-br ${vibeGradient} shadow-lg grid place-items-center neon-ring`}>
              <KindIcon className="h-5 w-5 text-white drop-shadow-neon" />
              {activeNow > 0 && (
                <div className="absolute -top-1 -right-1">
                  <ActivityPulse active={true} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <KindBadge kind={kind} data={data} />
              
              {/* Status indicators */}
              <div className="flex items-center gap-1 text-[10px] text-white/60">
                {isPrivate && <Shield className="h-3 w-3" />}
                {activeNow > 0 && (
                  <div className="flex items-center gap-1">
                    <Radio className="h-3 w-3 text-neon-social" />
                    <span>{activeNow}</span>
                  </div>
                )}
                {trendingUp && <div className="text-neon-active">↗</div>}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-3">
            <h3 className="text-[13px] font-semibold text-white/90 mb-1 line-clamp-1">
              {name}
            </h3>
            {description && (
              <p className="text-[11px] text-white/60 line-clamp-2 mb-2">
                {description}
              </p>
            )}
            
            {/* Energy bar */}
            <EnergyBar energy={energy} vibe={vibe} />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 text-[11px] text-white/75 mb-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-white/60" />
              <span>{members} members</span>
              {recentMessages > 0 && (
                <span className="ml-1 text-neon-social">+{recentMessages}</span>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-1.5">
              <Activity className="h-3.5 w-3.5 text-white/60" />
              {convergenceNearby > 0 ? (
                <span>{convergenceNearby} nearby {distanceLabel && `• ${distanceLabel}`}</span>
              ) : (
                <span className="text-white/50">quiet</span>
              )}
            </div>
          </div>

          {/* Next action */}
          {next && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-white/85">
                  <span className="font-medium">{next.label}</span>
                  <span className="text-white/60 ml-1">• {next.when}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/60" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (action.variant === "primary") {
                    onPrimary?.(id);
                  } else {
                    onSecondary?.(id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition ${
                  action.variant === "primary"
                    ? "neon-ring bg-white/10 hover:bg-white/15 text-white/90"
                    : "bg-white/5 border border-white/10 hover:bg-white/10 text-white/75"
                }`}
              >
                <action.icon className="h-3.5 w-3.5" />
                <span>{action.label}</span>
              </button>
            ))}
            
            {showJoinButton && (
              <button 
                type="button"
                className="flex-1 py-1.5 rounded-lg neon-pill text-[11px] hover:bg-white/15 transition neon-ring"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPrimary?.(id);
                }}
              >
                {isPrivate ? 'Request to Join' : 'Join Floq'}
              </button>
            )}
          </div>
        </Glass>
      </Link>
    </article>
  );
}