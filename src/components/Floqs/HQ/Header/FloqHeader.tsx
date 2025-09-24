import React from "react";
import { useFloqVibe, vibeToColors } from "@/hooks/useFloqVibe";
import { pickIconForId } from "@/lib/iconSeed";
// import { FloqBadges } from "./FloqBadges"; // header pills removed

export function FloqHeader({
  floqId,
  name,
  description,
  avatarUrl,
  memberCount = 12,
  rightBadges,
  showHeroPills = false      // optional flag (default off)
}: {
  floqId: string;
  name: string;
  description?: string;
  avatarUrl?: string | null;
  memberCount?: number;
  rightBadges?: React.ReactNode;
  showHeroPills?: boolean;
}) {
  const { data: frame } = useFloqVibe(floqId);
  const vibe = vibeToColors({ 
    joint_energy: frame?.joint_energy ?? 0.5, 
    harmony: frame?.harmony ?? 0.5 
  });

  // Build badges dynamically based on actual data
  const memberBadges = [
    { id: "members", label: `${memberCount} members`, tone: "cyan" as const },
    { id: "energy", label: frame?.joint_energy && frame.joint_energy >= 0.7 ? "High Energy" : "Steady", tone: frame?.joint_energy && frame.joint_energy >= 0.7 ? "raspberry" as const : "gold" as const },
  ];
  
  const awardBadges = [
    { id: "awards-1", label: "Thursday Legends", tone: "cyan" as const },
    { id: "awards-2", label: "5-Week Streak", tone: "cyan" as const },
    { id: "awards-3", label: "Gran Regulars", tone: "cyan" as const }
  ];

  const avatarBg = `radial-gradient(45% 45% at 50% 40%, ${vibe.glowA}50, transparent 60%)`;
  const auraBg   = `radial-gradient(35% 35% at 50% 50%, ${vibe.glowA}40, transparent 55%),
                    radial-gradient(40% 40% at 50% 50%, ${vibe.glowB}35, transparent 65%)`;

  return (
    <div className="neon-surface flex items-start justify-between gap-3">
      {/* Left: avatar with subtle vibe aura */}
      <div className="aura-ring"
           style={{ background: avatarBg }}
      >
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden grid place-items-center
                        bg-zinc-900/60 border border-white/8 relative"
             style={{ boxShadow: `0 0 0 1px rgba(255,255,255,.06)` }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (() => {
            const IconComponent = pickIconForId(floqId);
            return (
              <IconComponent 
                size={30} 
                className="text-white/95"
                style={{ filter: `drop-shadow(0 0 6px ${vibe.glowA}80) drop-shadow(0 0 12px ${vibe.glowB}60) drop-shadow(0 0 4px rgba(255,255,255,0.7))` }}
              />
            );
          })()}
        </div>
        {/* dynamic aura */}
        <style>{`
          .aura-ring::after { background: ${auraBg}; }
        `}</style>
      </div>

      {/* Center: title + tagline + info */}
      <div className="flex-1 min-w-0">
        <h1 className="title-neon text-[20px] sm:text-[24px] leading-tight mb-1"
            data-text={name}
            style={{ 
              textShadow: `${vibe.titleShadow}, 0 0 2px rgba(255,255,255,0.6), 0 0 6px ${vibe.glowA}60, 0 0 12px ${vibe.glowB}40`,
              filter: `drop-shadow(0 0 1px ${vibe.glowA}80)`
            }}>
          {name}
        </h1>
        {description && (
          <div className="text-white/75 text-[11px] mb-2 truncate">{description}</div>
        )}
        
        {/* Optional: allow pills again when explicitly requested (uniform style only) */}
        {showHeroPills && (
          <div className="header-pills mt-2 flex flex-wrap gap-2">
            {/* keep these uniform tone if you ever show them */}
            {/* <span className="badge badge-xs">Thursday Legends</span>
                <span className="badge badge-xs">5-Week Streak</span>
                <span className="badge badge-xs">Gran Regulars</span> */}
          </div>
        )}
      </div>

      {/* Right: badges/actions */}
      <div className="shrink-0 flex items-center gap-2">{rightBadges}</div>
    </div>
  );
}