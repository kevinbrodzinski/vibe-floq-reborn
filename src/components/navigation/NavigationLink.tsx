import { LedgerLink } from '@/core/context/useRouterLedger';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavigationLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Navigation Link component that automatically tracks transitions
 * Uses LedgerLink for better latency measurement and context tracking
 */
export function NavigationLink({ 
  to, 
  icon: Icon, 
  label, 
  isActive, 
  className,
  onClick 
}: NavigationLinkProps) {
  return (
    <LedgerLink
      to={to}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
        isActive 
          ? "text-primary bg-primary/10" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        className
      )}
    >
      <Icon className="h-6 w-6 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </LedgerLink>
  );
}