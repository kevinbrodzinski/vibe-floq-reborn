import * as React from "react";

export type AvatarItem = {
  id: string;
  name?: string | null;
  imageUrl?: string | null;
  /** If provided, clicking this avatar should open that floq's Peek. */
  floqId?: string | null;
};

type Props = {
  items: AvatarItem[];
  max?: number;      // default 4
  size?: number;     // px, default 24
  overlap?: number;  // px, default 8
  ring?: number;     // px, default 2
  className?: string;
  /** Optional click handler; if omitted avatars are non-interactive. */
  onAvatarPress?: (item: AvatarItem, e: React.MouseEvent | React.KeyboardEvent) => void;
};

export function AvatarStack({
  items, max = 4, size = 24, overlap = 8, ring = 2, className = "", onAvatarPress,
}: Props) {
  const visible = items.slice(0, Math.max(0, max));
  const overflow = Math.max(0, items.length - visible.length);

  return (
    <div className={`flex items-center ${className}`} aria-label="Friends in this floq">
      {visible.map((p, i) => (
        <AvatarBubble
          key={p.id || `${i}`}
          item={p}
          size={size}
          ring={ring}
          style={{ marginLeft: i === 0 ? 0 : -overlap }}
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

/* — internals — */

function AvatarBubble({
  item, size, ring, style, onPress,
}: {
  item: AvatarItem; size: number; ring: number; style?: React.CSSProperties;
  onPress?: (item: AvatarItem, e: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const [broken, setBroken] = React.useState(false);
  const initials = initialsFromName(item.name ?? "");

  const clickable = !!onPress;
  const common = {
    className:
      "relative inline-flex select-none items-center justify-center rounded-full " +
      "bg-muted text-[11px] font-medium text-muted-foreground ring-background overflow-hidden",
    style: { width: size, height: size, boxShadow: `0 0 0 ${ring}px hsl(var(--background))`, ...style },
    title: item.name || "Friend",
    "aria-label": item.name ? `${item.name} avatar` : "Avatar",
  } as const;

  const handleKey = (e: React.KeyboardEvent) => {
    if (!onPress) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPress(item, e);
    }
  };

  if (!clickable) {
    return (
      <span {...common} role="img">
        {renderImg(item.imageUrl, broken, () => setBroken(true), initials)}
      </span>
    );
  }

  // interactive & a11y-safe
  return (
    <button
      {...common}
      type="button"
      role="button"
      tabIndex={0}
      onClick={(e) => onPress?.(item, e)}
      onKeyDown={handleKey}
      className={`${common.className} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring`}
    >
      {renderImg(item.imageUrl, broken, () => setBroken(true), initials)}
    </button>
  );
}

function renderImg(
  url: string | null | undefined,
  broken: boolean,
  onError: () => void,
  initials: string,
) {
  if (url && !broken && typeof document !== "undefined") {
    return (
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={onError}
      />
    );
  }
  return <span>{initials}</span>;
}

function OverflowChip({
  count, size, ring, style,
}: { count: number; size: number; ring: number; style?: React.CSSProperties }) {
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
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
