import React from "react";

export default function Pill({ 
  children, 
  active,
  glow = true,
  className = ""
}: { 
  children: React.ReactNode;
  active?: boolean;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span className={`${
      glow 
        ? "chip-glow" 
        : `px-2.5 py-1 rounded-full text-[11px] text-white/80 border ${
            active 
              ? "bg-white/15 border-white/20" 
              : "bg-white/10 border-white/10"
          }`
    } ${className}`}>
      {children}
    </span>
  );
}