import React from "react";

export default function Pill({ 
  children, 
  active=false, 
  glow=false 
}: { 
  children: React.ReactNode; 
  active?: boolean;
  glow?: boolean;
}) {
  const glowClass = glow ? "neon-soft" : "";
  return (
    <span className={`chip-compact ${glowClass}`} data-active={active ? "true" : "false"}>
      {children}
    </span>
  );
}