import { cn } from '@/lib/utils'

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
  icon?: React.ReactNode
}

export const Chip = ({ color = 'slate', icon, className, children, ...rest }: ChipProps) => (
  <span
    {...rest}
    className={cn(
      'inline-flex items-center gap-1 rounded-full bg-opacity-10 px-2 py-0.5 text-xs font-medium transition-colors',
      `bg-${color}-500 text-${color}-700 dark:bg-${color}-400 dark:text-${color}-200`,
      'hover:bg-opacity-20',
      className
    )}
  >
    {icon}
    {children}
  </span>
)