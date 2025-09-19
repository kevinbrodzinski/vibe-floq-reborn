import React from "react";

type Props = {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
};

export default function Pill({ children, glow = true, className = "" }: Props) {
  return (
    <span
      className={[
        "px-2.5 py-1 rounded-full text-[11px]",
        "bg-white/10 border border-white/10 text-white/80",
        glow ? "chip-glow" : "",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}