import React from "react";

export default function Pill({
  glow = true,
  className = "",
  children,
}: {
  glow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "px-2.5 py-1 rounded-full bg-white/10 text-[11px] text-white/80 border border-white/10",
        glow ? "chip-glow" : "",
        className,
      ].join(" ").trim()}
    >
      {children}
    </span>
  );
}