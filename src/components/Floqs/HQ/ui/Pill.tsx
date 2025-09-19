import React from "react";

export default function Pill({
  children,
  glow = true,
  className = "",
}: {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] bg-white/6 border border-white/12 chip ${glow ? "chip-glow" : ""} ${className}`}>
      {children}
    </span>
  );
}