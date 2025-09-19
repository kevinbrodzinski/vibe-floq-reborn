import React from "react";

export default function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" 
        style={{ width: `${value}%` }} 
      />
    </div>
  );
}