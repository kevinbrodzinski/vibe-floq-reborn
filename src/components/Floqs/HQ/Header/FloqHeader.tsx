import React from "react";
import { useFloqVibe, vibeToColors } from "@/hooks/useFloqVibe";
import { pickEmojiForId } from "@/lib/iconSeed";

export function FloqHeader({
  floqId,
  name,
  description,
  avatarUrl,
  rightBadges
}: {
  floqId: string;
  name: string;
  description?: string;
  avatarUrl?: string | null;
  rightBadges?: React.ReactNode;
}) {
  const { data: frame } = useFloqVibe(floqId);
  const vibe = vibeToColors({ joint_energy: frame?.joint_energy ?? 0.5, harmony: frame?.harmony ?? 0.5 });

  const avatarBg = `radial-gradient(65% 65% at 50% 40%, ${vibe.glowA}, transparent 70%)`;
  const auraBg   = `radial-gradient(55% 55% at 50% 50%, ${vibe.glowA}, transparent 65%),
                    radial-gradient(60% 60% at 50% 50%, ${vibe.glowB}, transparent 70%)`;

  return (
    <div className="flex items-start justify-between gap-3">
      {/* Left: avatar with vibe aura */}
      <div className="aura-ring"
           style={{ background: avatarBg }}
      >
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden grid place-items-center
                        bg-zinc-900/70 border border-white/10 relative"
             style={{ boxShadow: `0 0 0 1px rgba(255,255,255,.08)` }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span style={{ fontSize: 28 }}>{pickEmojiForId(floqId)}</span>
          )}
        </div>
        {/* dynamic aura */}
        <style>{`
          .aura-ring::after { background: ${auraBg}; }
        `}</style>
      </div>

      {/* Center: title + description */}
      <div className="flex-1 min-w-0">
        <h1 className="title-neon text-[22px] sm:text-[26px] leading-tight"
            style={{ textShadow: vibe.titleShadow }}>
          {name}
        </h1>
        {description && (
          <div className="text-white/70 text-[12.5px] truncate">{description}</div>
        )}
      </div>

      {/* Right: badges/actions */}
      <div className="shrink-0 flex items-center gap-2">{rightBadges}</div>
    </div>
  );
}