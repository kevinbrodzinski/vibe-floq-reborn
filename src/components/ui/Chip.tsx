import * as React from 'react';
import { cn } from '@/lib/utils';
import { CHIP_COLOR_PALETTE } from '@/constants/moments';

type ChipColors = keyof typeof CHIP_COLOR_PALETTE;
type BaseProps = {
  color?: ChipColors;
  icon?: React.ReactNode;
  pressed?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type StaticProps = BaseProps & React.HTMLAttributes<HTMLSpanElement> & { onClick?: undefined; disabled?: undefined; };
type ButtonProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Chip(props: StaticProps | ButtonProps) {
  const { color='slate', icon, pressed, className, children, ...rest } = props as any;
  const palette = CHIP_COLOR_PALETTE[color] ?? CHIP_COLOR_PALETTE.slate;
  const base = cn(
    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors duration-150',
    pressed ? 'ring-2 ring-current' : '',
    palette,
    className
  );

  const Content = (
    <>
      {icon}
      {children}
    </>
  );

  // Interactive -> <button>
  if ('onClick' in props && typeof (props as any).onClick === 'function') {
    const btn = props as ButtonProps;
    return (
      <button
        type="button"
        aria-pressed={pressed ?? undefined}
        className={base}
        {...btn}
      >
        {Content}
      </button>
    );
  }

  // Static -> <span>
  return (
    <span className={base} {...(rest as StaticProps)}>
      {Content}
    </span>
  );
}

// Back-compat if needed
export function ChipLegacy(props: Omit<StaticProps,'asChild'>) {
  return <Chip {...props} />;
}