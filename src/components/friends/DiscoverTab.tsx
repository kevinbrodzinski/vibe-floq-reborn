import React, { useEffect } from 'react'
import { Search, UserPlus, Loader2 } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserTag } from '@/components/ui/user-tag'
import { useFriendDiscovery } from '@/hooks/useFriendDiscovery'
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends'
import { toast } from 'sonner'

export function DiscoverTab() {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    hasResults,
    isEmpty
  } = useFriendDiscovery()
  
  const { sendRequest, updating, friendIds, rows: allFriends } = useUnifiedFriends()

  // Focus search input when tab becomes active
  useEffect(() => {
    const searchInput = document.querySelector('[data-discover-search]') as HTMLInputElement
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100)
    }
  }, [])

  // Keyboard shortcut to focus search
  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    const searchInput = document.querySelector('[data-discover-search]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }, { enableOnContentEditable: true, enableOnFormTags: true })

  const handleAddFriend = async (profileId: string, displayName: string) => {
    try {
      await sendRequest(profileId)
      toast.success(`Friend request sent to ${displayName}`)
    } catch (error) {
      console.error('Failed to send friend request:', error)
      toast.error('Failed to send friend request')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-discover-search
          placeholder="Search by username or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Searching...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Empty Search State */}
      {isEmpty && !loading && (
        <div className="text-center py-8 space-y-2">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            Search for people by username or name
          </p>
          <p className="text-xs text-muted-foreground">
            Find friends and start connecting
          </p>
        </div>
      )}

      {/* No Results State */}
      {!isEmpty && !loading && !hasResults && !error && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No users found for "{query}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different name or username
          </p>
        </div>
      )}

      {/* Results List */}
      {hasResults && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} user{results.length === 1 ? '' : 's'} found
            </p>
          </div>

          <div className="space-y-2">
            {results.map((user) => {
              const isFriend = friendIds.includes(user.id)
              const hasPendingRequest = user.has_pending_request
              
              return (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {(user.display_name || user.username || 'U')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <UserTag
                        profile={{
                          ...user,
                          full_name: user.display_name
                        }}
                        showUsername={true}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFriend && (
                      <Badge variant="secondary" className="text-xs">
                        Friends
                      </Badge>
                    )}
                    
                    {hasPendingRequest && (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                    
                    {!isFriend && !hasPendingRequest && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddFriend(user.id, user.display_name || user.username || 'User')}
                        disabled={updating}
                        className="h-8 px-3"
                      >
                        {updating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}