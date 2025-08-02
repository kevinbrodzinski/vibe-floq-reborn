import { Users } from 'lucide-react'
import { useFriendDrawer } from '@/contexts/FriendDrawerContext'

export const FriendFab = () => {
  const { open, toggle } = useFriendDrawer()

  return (
    <button
      onClick={toggle}
      aria-label="Toggle nearby friends"
      aria-controls="friend-drawer"
      aria-expanded={open}
      className="
        fixed top-24 right-4 z-[65] h-11 w-11
        rounded-full bg-background/90 backdrop-blur
        flex items-center justify-center shadow-lg
        border border-border hover:bg-muted/50 transition-colors
      ">
      <Users className="h-5 w-5" />
    </button>
  )
}