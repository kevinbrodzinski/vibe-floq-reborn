import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export const CardSkeleton = () => (
  <div role="status" className="animate-pulse rounded-lg bg-muted h-36 w-full" />
);

export { Skeleton }
