import React, { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useInviteToFloq } from '@/hooks/useInviteToFloq'
import { useSession } from '@supabase/auth-helpers-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUserSearch } from '@/hooks/useUserSearch'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { cn } from '@/lib/utils'
import { VariantProps } from 'class-variance-authority'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Friend {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

interface InviteFriendsButtonProps {
  floqId: string
  className?: string
  variant?: VariantProps<typeof Button>['variant']
  size?: VariantProps<typeof Button>['size']
  disabled?: boolean
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export const InviteFriendsButton: React.FC<InviteFriendsButtonProps> = ({
  floqId,
  className,
  variant = 'outline',
  size = 'default',
  disabled = false,
}) => {
  /* ----------------------------- Local state ----------------------------- */

  const session      = useSession()
  const [isOpen, setIsOpen]               = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [query, setQuery]                 = useState('')
  const { socialHaptics }                 = useHapticFeedback()
  const { mutateAsync: inviteToFloq, isPending } = useInviteToFloq()

  /* --------------------------- Friends + search -------------------------- */

  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey : ['friends-with-presence', isOpen],
    enabled  : isOpen,
    queryFn  : async (): Promise<Friend[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return []

      /* — single RPC that returns BOTH directions — */
      const { data, error } = await supabase.rpc('get_friends_with_presence')
      if (error) throw error

      return (
        data?.map((r: any) => ({
          id          : r.friend_id,
          username    : r.username ?? '',
          display_name: r.display_name ?? '',
          avatar_url  : r.avatar_url ?? undefined,
        })) ?? []
      )
    },
  })

  const filtered = friends.filter(f =>
    f.display_name.toLowerCase().includes(query.toLowerCase()) ||
    f.username.toLowerCase().includes(query.toLowerCase())
  )

  const { data: searchResults = [], isLoading: searchLoading } =
    useUserSearch(query, isOpen)

  const merged =
    query.length >= 3
      ? [
          ...filtered,
          ...searchResults.filter(
            u => !filtered.some(f => f.id === u.id)
          ),
        ]
      : filtered

  /* ------------------------------ Handlers ------------------------------ */

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleInvite = async () => {
    if (selected.size === 0) return
    try {
      await inviteToFloq({
        floqId,
        inviteeIds: Array.from(selected),
      })
      socialHaptics.connectionMade()
      setSelected(new Set())
      setIsOpen(false)
    } catch (e) {
      console.error('Failed to send invitations:', e)
    }
  }

  /* ---------------------------- Friend card ----------------------------- */

  const FriendCard: React.FC<{ friend: Friend }> = ({ friend }) => {
    const isSelected = selected.has(friend.id)
    return (
      <Card
        className={cn(
          'p-3 cursor-pointer transition-colors',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'hover:bg-muted/50'
        )}
        onClick={() => toggle(friend.id)}
        role="button"
        tabIndex={0}
        aria-label={`${isSelected ? 'Remove' : 'Add'} ${friend.display_name}`}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle(friend.id)
          }
        }}
      >
        <div className="flex items-center gap-3">
          <Checkbox checked={isSelected} className="pointer-events-none" />

          <Avatar className="w-10 h-10">
            <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
            <AvatarFallback>
              {friend.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{friend.display_name}</p>
            <p className="text-sm text-muted-foreground truncate">
              @{friend.username}
            </p>
          </div>

          {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
        </div>
      </Card>
    )
  }

  /* ------------------------------ Render ------------------------------- */

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant={variant}
                size={size}
                className={className}
                disabled={disabled}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </DialogTrigger>
          </TooltipTrigger>

          {disabled && (
            <TooltipContent>
              <p>Floq is at capacity</p>
            </TooltipContent>
          )}
        </Tooltip>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Friends</DialogTitle>
            <DialogDescription>
              Search for friends to invite to this floq or discover new people to connect with.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Search friends..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full"
              autoFocus
            />

            {/* Selected count */}
            {selected.size > 0 && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {selected.size} friend{selected.size > 1 && 's'} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Friends / search results */}
            <div className="max-h-60 overflow-y-auto space-y-2" tabIndex={0}>
              {friendsLoading || searchLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                      <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
                      <div className="space-y-1 flex-1">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : merged.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {query.length >= 3 ? 'No users found' : 'No friends to invite'}
                  </p>
                </div>
              ) : (
                merged.map((u: any) => (
                  <FriendCard
                    key={u.id}
                    friend={
                      'id' in u
                        ? (u as Friend)
                        : {
                            id: u.id,
                            username: u.username,
                            display_name: u.display_name ?? u.full_name ?? 'User',
                            avatar_url: u.avatar_url,
                          }
                    }
                  />
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={selected.size === 0 || isPending}
                className="flex-1"
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Invite {selected.size > 0 && `(${selected.size})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}