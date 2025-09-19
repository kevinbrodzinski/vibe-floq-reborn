import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  glow?: boolean;
  active?: boolean;
};

export default function Btn({
  glow = false,
  active,
  className = "",
  children,
  ...props
}: BtnProps) {
  return (
    <button
      {...props}
      className={[
        "px-3 py-1.5 rounded-xl border text-[12px] transition",
        active ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10",
        glow ? "btn-glow" : "",
        className,
      ].join(" ").trim()}
    >
      {children}
    </button>
  );
}