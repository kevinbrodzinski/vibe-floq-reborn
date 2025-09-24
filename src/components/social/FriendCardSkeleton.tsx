import { memo } from 'react'

export const FriendCardSkeleton = memo(() => {
  return (
    <div className="
      snap-start shrink-0 w-[116px] p-3 rounded-xl border
      bg-card/70 animate-pulse
    ">
      <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-muted/60" />
      
      <div className="h-3 bg-muted/60 rounded mb-1" />
      <div className="h-2 bg-muted/40 rounded mb-2 w-8 mx-auto" />
      
      <div className="h-5 bg-muted/50 rounded-full w-12 mx-auto" />
    </div>
  )
})