import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  glow?: boolean;
  tone?: "default" | "primary" | "subtle";
  size?: "sm" | "md";
};

export default function Btn({ glow, tone="primary", size="md", className="", ...rest }: Props) {
  const base = "rounded-2xl font-medium transition shadow-sm";
  const pxpy = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const skin =
    tone === "primary"
      ? "bg-white text-black"
      : tone === "subtle"
      ? "bg-white/10 text-white/85 border border-white/15 hover:bg-white/14"
      : "bg-white/6 text-white/85 border border-white/12";

  const neon = glow ? "ring-neon" : "";
  return <button className={`${base} ${pxpy} ${skin} ${neon} ${className}`} {...rest} />;
}