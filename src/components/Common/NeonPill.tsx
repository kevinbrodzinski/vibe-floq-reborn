import React from "react";

interface NeonPillProps {
  children: React.ReactNode;
  className?: string;
}

export function NeonPill({ children, className = "" }: NeonPillProps) {
  return (
    <span className={`neon-pill px-3 py-1 rounded-full text-[11px] text-white/85 ${className}`}>
      {children}
    </span>
  );
}