import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean; 
  glow?: boolean;
};

export default function Btn({ 
  children,
  active, 
  glow = false, 
  className = "", 
  ...props 
}: BtnProps) {
  return (
    <button
      {...props}
      className={[
        "px-3 py-1.5 rounded-xl border text-[12px] transition inline-flex items-center gap-1",
        active ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10",
        glow ? "neon-ring" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}