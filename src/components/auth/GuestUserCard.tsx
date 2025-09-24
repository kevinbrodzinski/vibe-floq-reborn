import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Edit, RefreshCw, LogIn } from 'lucide-react'
import { useGuestSession } from '@/hooks/useGuestSession'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GuestUserCardProps {
  showEditName?: boolean
  showLoginPrompt?: boolean
  onLoginClick?: () => void
  className?: string
}

export function GuestUserCard({
  showEditName = true,
  showLoginPrompt = true,
  onLoginClick,
  className
}: GuestUserCardProps) {
  const {
    guestName,
    guestId,
    isLoading,
    updateGuestName,
    regenerateGuestSession
  } = useGuestSession()

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(guestName || '')

  const handleSaveName = () => {
    if (editName.trim()) {
      updateGuestName(editName.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditName(guestName || '')
    setIsEditing(false)
  }

  const handleRegenerate = () => {
    regenerateGuestSession()
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
            <div className="space-y-1">
              <div className="w-24 h-4 bg-muted animate-pulse rounded" />
              <div className="w-16 h-3 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="w-4 h-4" />
          Guest User
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Name Section */}
        <div className="space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveName} disabled={!editName.trim()}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <motion.p 
                  className="font-medium"
                  key={guestName}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {guestName}
                </motion.p>
                <Badge variant="secondary" className="text-xs">
                  Anonymous
                </Badge>
              </div>
              {showEditName && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRegenerate}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Session Info */}
        <div className="text-xs text-muted-foreground">
          <p>Session: {guestId?.slice(0, 8)}...</p>
          <p>Your votes and comments will be saved for this session</p>
        </div>

        {/* Login Prompt */}
        {showLoginPrompt && onLoginClick && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2 border-t border-border"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onLoginClick}
              className="w-full gap-2"
            >
              <LogIn className="w-3 h-3" />
              Sign up to save permanently
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}