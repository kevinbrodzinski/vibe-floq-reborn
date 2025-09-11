import * as React from 'react';
import { cn } from '@/lib/utils';
import { CHIP_COLOR_PALETTE } from '@/constants/moments';

type ChipColors = keyof typeof CHIP_COLOR_PALETTE;
type BaseProps = {
  color?: ChipColors;
  icon?: React.ReactNode;
  pressed?: boolean;
  asChild?: boolean;         // if you need Slot polymorphism later
  className?: string;
  children?: React.ReactNode;
};

type StaticProps = BaseProps & React.HTMLAttributes<HTMLSpanElement> & { onClick?: undefined; disabled?: undefined; };
type ButtonProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Chip(props: StaticProps | ButtonProps) {
  const { color='slate', icon, pressed, className, children, ...rest } = props as any;
  const palette = CHIP_COLOR_PALETTE[color] ?? CHIP_COLOR_PALETTE.slate;
  const base = cn(
    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs',
    'transition-colors duration-150',
    pressed ? 'ring-2 ring-current' : '',
    palette,
    className
  );

  const Content = (
    <>
      {icon && <span aria-hidden className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </>
  );

  if ('onClick' in props) {
    const btn = props as ButtonProps;
    return (
      <button
        type="button"
        aria-pressed={pressed || undefined}
        className={cn(base, 'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2')}
        {...btn}
      >
        {Content}
      </button>
    );
  }

  const span = props as StaticProps;
  return (
    <span className={base} {...span}>
      {Content}
    </span>
  );
}

/** Back-compat wrapper if you need to preserve old API temporarily */
export function ChipLegacy(props: Omit<ButtonProps,'pressed'>) {
  return <Chip {...props} />;
}