import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Clock, User, UserCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface EncounteredUser {
  user_id: string
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

  useEffect(() => {
    if (isOpen && encounteredUsers.length > 0) {
      fetchUserProfiles()
    }
  }, [isOpen, encounteredUsers])

  const fetchUserProfiles = async () => {
    if (encounteredUsers.length === 0) return

    setIsLoading(true)
    try {
      const userIds = encounteredUsers.map(user => user.user_id)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      if (error) throw error
      setUserProfiles(data || [])
    } catch (err) {
      console.error('Error fetching user profiles:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getInteractionStrengthLabel = (strength: number) => {
    if (strength >= 0.8) return { label: 'Strong', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' }
    if (strength >= 0.6) return { label: 'Good', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' }
    if (strength >= 0.4) return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' }
    return { label: 'Brief', color: 'bg-gray-500/20 text-gray-600 border-gray-500/30' }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getInteractionTypeIcon = (type: string) => {
    switch (type) {
      case 'chat': return <User className="w-4 h-4" />
      case 'hangout': return <Heart className="w-4 h-4" />
      case 'activity': return <UserCheck className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
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

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
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
              {encounteredUsers.map((encounter) => {
                const profile = userProfiles.find(p => p.id === encounter.user_id)
                const strengthInfo = getInteractionStrengthLabel(encounter.interaction_strength)
                
                return (
                  <div key={encounter.user_id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback>
                        {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {profile?.display_name || profile?.username || 'Unknown User'}
                        </p>
                        <div className="flex items-center gap-1">
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
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(encounter.shared_duration)}
                        </div>
                        {profile?.username && (
                          <span className="text-xs text-muted-foreground">@{profile.username}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {encounteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No known connections at this moment</p>
              <p className="text-xs mt-1">You encountered {totalPeopleCount} people total</p>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}