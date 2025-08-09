import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Compass, Bell, CheckCheck } from "lucide-react"          // ← Bell added
import { AvatarDropdown } from "@/components/AvatarDropdown"
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet"
import { SafeModeButton } from "@/components/ui/SafeModeButton"
import { useSafeMode } from "@/hooks/useSafeMode"
import { useEventNotifications } from "@/providers/EventNotificationsProvider"

import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"

interface FieldHeaderProps {
  className?: string
  style?: React.CSSProperties
  onNavigate?: () => void
  showMiniMap?: boolean
  onToggleMiniMap?: () => void
  venueCount?: number
  onOpenVenues?: () => void
}

export const FieldHeader = ({
  className,
  style,
  onNavigate,
  showMiniMap,
  onToggleMiniMap,
  venueCount = 0,
  onOpenVenues,
}: FieldHeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { isActive, toggleSafeMode } = useSafeMode()
  const { unseen, markAllSeen } = useEventNotifications()
  const totalUnread = unseen.length

  return (
    <header
      className={cn(
        "flex items-center justify-between px-6 pt-safe-top h-16",
        "pointer-events-auto relative",
        "bg-background/60 backdrop-blur-xl",
        "border-b border-border/20",
        className,
      )}
      style={style}
    >
      {/* Left spacer */}
      <div className="w-[120px]" />

      {/* Center logo */}
      <div
        className="text-2xl font-light tracking-wide text-primary cursor-pointer"
        onClick={() => {
          track("posthog_test", {
            source: "field_header",
            timestamp: new Date().toISOString(),
            test: true,
          })
        }}
      >
        floq
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {onToggleMiniMap && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMiniMap}
            className={cn(
              "p-2 transition-colors",
              showMiniMap ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Compass className="w-4 h-4" />
          </Button>
        )}

        {/* Nearby venues icon with badge */}
        {onOpenVenues && (
          <button
            aria-label={`${venueCount} venues nearby`}
            onClick={onOpenVenues}
            className="relative text-primary hover:text-primary/80 transition-colors p-2"
          >
            <MapPin className="w-5 h-5" />
            {venueCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-destructive-foreground shadow">
                {venueCount > 9 ? "9+" : venueCount}
              </span>
            )}
          </button>
        )}

        <SafeModeButton
          isActive={isActive}
          onToggle={toggleSafeMode}
          className="pointer-events-auto"
        />

        {/* 🔔 Icon-only notifications button (replaces NotificationBell) */}
        <button
          onClick={() => setNotificationsOpen(true)}
          aria-label={totalUnread > 0 ? `Open notifications (${totalUnread} unread)` : "Open notifications"}
          className="relative text-primary hover:text-primary/80 transition-colors p-2"
        >
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-destructive-foreground shadow">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>

        {/* Quick action: Mark all read */}
        <button
          onClick={async () => { await markAllSeen(); setNotificationsOpen(true); }}
          aria-label="Mark all notifications read and open"
          className="text-muted-foreground hover:text-foreground transition-colors p-2"
          title="Mark all read"
        >
          <CheckCheck className="w-5 h-5" />
        </button>

        <AvatarDropdown />
      </div>

      <NotificationsSheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
    </header>
  )
}