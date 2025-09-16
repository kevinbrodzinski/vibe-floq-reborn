import * as React from "react";

/** Subtle two-pulse ripple. Place over a card corner or avatar cluster. */
export function RippleIndicator({
  active = true, className = "", size = 40,
}: { active?: boolean; className?: string; size?: number }) {
  if (!active) return null;
  return (
    <div className={`floq-ripple ${className}`} style={{ width: size, height: size }}>
      <span />
      <span />
    </div>
  );
}