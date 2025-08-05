import { planStatusConfig, type PlanStatus } from "@/lib/planStatusConfig";

interface PlanStatusTagProps {
  status: PlanStatus;
  className?: string;
}

export const PlanStatusTag = ({ status, className = "" }: PlanStatusTagProps) => {
  const config = planStatusConfig[status] || {
    label: 'Unknown',
    className: 'bg-muted/50 text-muted-foreground border-muted'
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
      transition-all duration-300 ${config.className} ${className}
    `}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {config.label}
    </span>
  );
};