import * as React from "react";
import { ProgressDonut } from "@/components/floqs/visual/ProgressDonut";
import { AvatarStack, AvatarItem } from "@/components/floqs/visual/AvatarStack";

type MetricCardProps = {
  floqId?: string;
  label: string;             // "Compatibility", "Friction", "Energy"
  ringValue: number;         // 0..1 for donut
  bigValueText: string;      // "85%", "Low", "78%"
  subLeft?: string;          // e.g., "92% of peak"
  subRight?: string;         // e.g., "128 in"
  friends?: AvatarItem[];
  onAvatarPress?: (a: AvatarItem, e: React.MouseEvent | React.KeyboardEvent) => void;
  live?: boolean;            // choose ring token set
};

export function MetricCard({
  floqId, label, ringValue, bigValueText, subLeft, subRight, friends = [],
  onAvatarPress, live = true,
}: MetricCardProps) {
  return (
    <div
      className="group relative grid grid-cols-[56px_1fr] items-center gap-3 rounded-xl border border-[hsl(var(--floq-card-border))]
                 bg-[hsl(var(--floq-card-bg)/0.5)] px-3 py-3 shadow-[0_0_0_1px_hsl(var(--border)),0_0_18px_hsl(var(--floq-card-glow)/.10)]
                 backdrop-blur transition hover:-translate-y-[1px]"
    >
      {/* Ring */}
      <div className="flex items-center justify-center h-14 w-14">
        <ProgressDonut value={ringValue} size={48} stroke={5} live={live} />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-2xl font-semibold leading-tight">{bigValueText}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {subLeft && <span className="truncate">{subLeft}</span>}
          {(subLeft || subRight) && subRight && <span className="opacity-40">•</span>}
          {subRight && <span className="truncate">{subRight}</span>}
        </div>

        {friends.length > 0 && (
          <div className="mt-1">
            <AvatarStack
              items={friends}
              max={4}
              size={20}
              overlap={7}
              onAvatarPress={(a, e) => onAvatarPress?.(a, e)}
            />
          </div>
        )}
      </div>
    </div>
  );
}