import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Clock, User, UserCheck, AlertCircle } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface EncounteredUser {
  profile_id: string
  interaction_strength: number
  shared_duration: number
  interaction_type: string
}

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

interface PeopleEncountersModalProps {
  isOpen: boolean
  onClose: () => void
  encounteredUsers: EncounteredUser[]
  totalPeopleCount: number
  momentTitle: string
}

export function PeopleEncountersModal({
  isOpen,
  onClose,
  encounteredUsers,
  totalPeopleCount,
  momentTitle
}: PeopleEncountersModalProps) {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Memoize user IDs to prevent unnecessary re-fetches
  const userIds = useMemo(() => 
    encounteredUsers.map(user => user.profile_id), 
    [encounteredUsers]
  )

  // Memoize interaction strength labels to avoid recalculation
  const getInteractionStrengthLabel = useCallback((strength: number) => {
    if (strength >= 0.8) return { label: 'Strong', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' }
    if (strength >= 0.6) return { label: 'Good', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' }
    if (strength >= 0.4) return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' }
    return { label: 'Brief', color: 'bg-gray-500/20 text-gray-600 border-gray-500/30' }
  }, [])

  // Memoize duration formatting
  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }, [])

  // Memoize interaction type icon mapping
  const getInteractionTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'chat': return <User className="w-4 h-4" />
      case 'hangout': return <Heart className="w-4 h-4" />
      case 'activity': return <UserCheck className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }, [])

  // Memoize user profiles map for faster lookups
  const userProfilesMap = useMemo(() => 
    new Map(userProfiles.map(profile => [profile.id, profile])),
    [userProfiles]
  )

  useEffect(() => {
    if (isOpen && encounteredUsers.length > 0) {
      fetchUserProfiles()
    } else if (isOpen) {
      // Reset state when modal opens with no users
      setUserProfiles([])
      setError(null)
    }
  }, [isOpen, userIds])

  const fetchUserProfiles = async () => {
    if (encounteredUsers.length === 0) return

    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      if (error) throw error
      setUserProfiles(data || [])
    } catch (err) {
      console.error('Error fetching user profiles:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user profiles'
      setError(errorMessage)
      toast.error('Failed to load user profiles')
    } finally {
      setIsLoading(false)
    }
  }

  // Memoize sorted encountered users for consistent rendering
  const sortedEncounteredUsers = useMemo(() => 
    [...encounteredUsers].sort((a, b) => b.interaction_strength - a.interaction_strength),
    [encounteredUsers]
  )

  const handleClose = useCallback(() => {
    setError(null)
    onClose()
  }, [onClose])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            People at {momentTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total people encountered</span>
              <Badge variant="secondary">{totalPeopleCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Known connections</span>
              <Badge variant="outline">{encounteredUsers.length}</Badge>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(Math.min(3, encounteredUsers.length))].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEncounteredUsers.map((encounter) => {
                const profile = userProfilesMap.get(encounter.profile_id)
                const strengthInfo = getInteractionStrengthLabel(encounter.interaction_strength)
                const displayName = profile?.display_name || profile?.username || 'Unknown User'
                const avatarFallback = profile?.display_name?.[0]?.toUpperCase() || 
                                     profile?.username?.[0]?.toUpperCase() || '?'
                
                return (
                  <div 
                    key={encounter.profile_id} 
                    className="flex items-center space-x-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    role="listitem"
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate" title={displayName}>
                          {displayName}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getInteractionTypeIcon(encounter.interaction_type)}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${strengthInfo.color}`}
                          >
                            {strengthInfo.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                          {formatDuration(encounter.shared_duration)}
                        </div>
                        {profile?.username && (
                          <span className="text-xs text-muted-foreground truncate">@{profile.username}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {encounteredUsers.length === 0 && !isLoading && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No known connections at this moment</p>
              <p className="text-xs mt-1">You encountered {totalPeopleCount} people total</p>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}