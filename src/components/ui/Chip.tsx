import { cn } from '@/lib/utils'
import { CHIP_COLOR_PALETTE } from '@/constants/moments'

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
  icon?: React.ReactNode
}

export const Chip = ({ color = 'slate', icon, className, children, ...rest }: ChipProps) => (
  <span
    {...rest}
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80',
      CHIP_COLOR_PALETTE[color] || CHIP_COLOR_PALETTE.slate,
      className
    )}
  >
    {icon}
    {children}
  </span>
)