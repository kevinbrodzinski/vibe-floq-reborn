import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export type AvatarItem = { 
  id: string; 
  name?: string | null; 
  imageUrl?: string | null; 
  floqId?: string | null; 
};

type Props = {
  items: AvatarItem[]; 
  max?: number; 
  size?: number; 
  overlap?: number; 
  ring?: number;
  className?: string; 
  onAvatarPress?: (item: AvatarItem, e: React.MouseEvent | React.KeyboardEvent) => void;
};

export function AvatarStack({ 
  items, max = 4, size = 24, overlap = 8, ring = 2, className = "", onAvatarPress 
}: Props) {
  const visible = items.slice(0, max);
  const overflow = Math.max(0, items.length - visible.length);
  
  return (
    <div className={`flex items-center ${className}`} aria-label="Friends in this floq">
      {visible.map((p, i) => (
        <AvatarBubble 
          key={p.id || `${i}`} 
          item={p} 
          size={size} 
          ring={ring} 
          style={{ marginLeft: i ? -overlap : 0 }} 
          onPress={onAvatarPress} 
        />
      ))}
      {overflow > 0 && (
        <OverflowChip 
          count={overflow} 
          size={size} 
          ring={ring} 
          style={{ marginLeft: visible.length ? -overlap : 0 }} 
        />
      )}
    </div>
  );
}

function AvatarBubble({
  item, size, ring, style, onPress,
}: { 
  item: AvatarItem; 
  size: number; 
  ring: number; 
  style?: React.CSSProperties;
  onPress?: (item: AvatarItem, e: React.MouseEvent | React.KeyboardEvent) => void; 
}) {
  const [broken, setBroken] = React.useState(false);
  const initials = initialsFromName(item.name ?? "");
  const clickable = !!onPress;

  const baseCls =
    "relative inline-flex select-none items-center justify-center rounded-full " +
    "bg-muted text-[11px] font-medium text-muted-foreground ring-background overflow-hidden";

  const common = {
    className: baseCls,
    style: { width: size, height: size, boxShadow: `0 0 0 ${ring}px hsl(var(--background))`, ...style },
    title: item.name || "Friend",
    "aria-label": item.name ? `${item.name} avatar` : "Avatar",
  } as const;

  const content =
    typeof document !== "undefined" && item.imageUrl && !broken ? (
      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
    ) : (
      <span>{initials}</span>
    );

  const MaybeTooltip = item.name ? Tooltip : React.Fragment;
  const maybeProps = item.name ? { delayDuration: 200 } : {};

  if (!clickable) {
    return (
      <MaybeTooltip {...(maybeProps as any)}>
        {item.name ? (
          <>
            <TooltipTrigger asChild>
              <span {...common} role="img">{content}</span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="px-2 py-1 text-xs">{item.name}</TooltipContent>
          </>
        ) : (
          <span {...common} role="img">{content}</span>
        )}
      </MaybeTooltip>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { 
      e.preventDefault(); 
      onPress?.(item, e); 
    }
  };

  return (
    <MaybeTooltip {...(maybeProps as any)}>
      {item.name ? (
        <>
          <TooltipTrigger asChild>
            <button
              {...common}
              type="button"
              role="button"
              tabIndex={0}
              onClick={(e) => onPress?.(item, e)}
              onKeyDown={onKeyDown}
              className={`${baseCls} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring`}
            >
              {content}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="px-2 py-1 text-xs">{item.name}</TooltipContent>
        </>
      ) : (
        <button
          {...common}
          type="button"
          role="button"
          tabIndex={0}
          onClick={(e) => onPress?.(item, e)}
          onKeyDown={onKeyDown}
          className={`${baseCls} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring`}
        >
          {content}
        </button>
      )}
    </MaybeTooltip>
  );
}

function OverflowChip({ 
  count, size, ring, style 
}: { 
  count: number; 
  size: number; 
  ring: number; 
  style?: React.CSSProperties 
}) {
  return (
    <span 
      className="inline-flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold ring-background"
      style={{ width: size, height: size, boxShadow: `0 0 0 ${ring}px hsl(var(--background))`, ...style }} 
      aria-label={`${count} more`} 
      title={`${count} more`}
    >
      +{count}
    </span>
  );
}

function initialsFromName(name?: string) {
  if (!name) return "•";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}