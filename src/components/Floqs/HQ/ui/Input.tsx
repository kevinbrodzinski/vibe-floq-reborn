import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { className?: string };
export function Input({ className = "", ...rest }: Props) {
  return (
    <input
      className={`w-full rounded-[18px] bg-white/6 border border-white/10
                  px-4 py-3 text-[14px] text-white/90 placeholder-white/40
                  outline-none focus:border-white/20 focus:bg-white/8 transition
                  shadow-[inset_0_1px_0_rgba(255,255,255,.06)] ${className}`}
      {...rest}
    />
  );
}

type TAProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string };
export function Textarea({ className = "", ...rest }: TAProps) {
  return (
    <textarea
      className={`w-full rounded-[18px] bg-white/6 border border-white/10
                  px-4 py-3 text-[14px] text-white/90 placeholder-white/40
                  outline-none focus:border-white/20 focus:bg-white/8 transition
                  shadow-[inset_0_1px_0_rgba(255,255,255,.06)] resize-none ${className}`}
      {...rest}
    />
  );
}