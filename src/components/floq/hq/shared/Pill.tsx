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
        glow ? "ring-1 ring-fuchsia-400/30 shadow-[0_0_20px_-6px_rgba(236,72,153,.5)]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}