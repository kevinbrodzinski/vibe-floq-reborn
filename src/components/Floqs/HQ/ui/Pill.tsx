import React from "react";

export default function Pill({
  children,
  active = false,
  glow = false,
  className = "",
}: {
  children: React.ReactNode;
  active?: boolean;
  glow?: boolean;
  className?: string;
}) {
  const glowClass = glow ? "neon-soft" : "";
  return (
    <span className={`chip-compact ${glowClass} ${className}`} data-active={active ? "true" : "false"}>
      {children}
    </span>
  );
}