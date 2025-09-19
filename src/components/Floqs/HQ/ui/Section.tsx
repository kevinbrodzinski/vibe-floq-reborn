import React from "react";

export default function Section({
  title, 
  icon, 
  right, 
  children, 
  className = ""
}: { 
  title: string; 
  icon: React.ReactNode; 
  right?: React.ReactNode; 
  children?: React.ReactNode; 
  className?: string 
}) {
  return (
    <div className={["rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 shadow-xl", className].join(" ")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-white/10 grid place-items-center text-white/80">{icon}</div>
          <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}