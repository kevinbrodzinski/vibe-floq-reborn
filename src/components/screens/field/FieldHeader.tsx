import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Compass, Bell } from "lucide-react"          // ← Bell added
import { AvatarDropdown } from "@/components/AvatarDropdown"
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet"
import { SafeModeButton } from "@/components/ui/SafeModeButton"
import { useSafeMode } from "@/hooks/useSafeMode"

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

  // Mock mode state (dev or explicit flags)
  let mockHelpers: any = null;
  const isDev = (import.meta as any).env?.MODE !== 'production' && (import.meta as any).env?.DEV !== false;
  const showMockToggle = (() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('mock') === '1') return true;
      if (localStorage.getItem('floq-dev-tools') === '1') return true;
    } catch {}
    return isDev;
  })();
  if (showMockToggle) {
    try { mockHelpers = require('@/lib/mock/MockMode'); } catch {}
  }

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

        {/* Dev-only: Mock mode toggle */}
        {showMockToggle && mockHelpers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const { isMockModeEnabled, enableMockModeForSeconds, disableMockMode } = mockHelpers;
              if (isMockModeEnabled()) {
                disableMockMode();
              } else {
                enableMockModeForSeconds(15 * 60); // 15 minutes by default
              }
            }}
            title="Toggle mock data"
            className="p-2 text-muted-foreground hover:text-primary"
          >
            {(mockHelpers?.isMockModeEnabled?.() ? 'Mock: On' : 'Mock: Off') as string}
          </Button>
        )}

        <SafeModeButton
          isActive={isActive}
          onToggle={toggleSafeMode}
          className="pointer-events-auto"
        />

        {/* 🔔 Icon-only notifications button (replaces NotificationBell) */}
        <button
          onClick={() => setNotificationsOpen(true)}
          aria-label="Open notifications"
          className="relative text-primary hover:text-primary/80 transition-colors p-2"
        >
          <Bell className="w-5 h-5" />
          {/* add a badge here if you track unread count */}
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