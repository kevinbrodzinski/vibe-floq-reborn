
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { WizardPortal } from '@/components/WizardPortal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends'
import { useUserSearch } from '@/hooks/useUserSearch'

interface FriendPickerProps {
  open: boolean
  initial?: string[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

export function FriendPicker({ open, initial = [], onClose, onConfirm }: FriendPickerProps) {
  const { rows: friendsWithPresence, isLoading: friendsLoading } = useUnifiedFriends()
  const [selected, setSelected] = useState<string[]>(initial)
  const [query, setQuery] = useState('')

  // Convert unified friends to simple profile format
  const friends = friendsWithPresence.filter(row => row.friend_state === 'accepted').map(row => ({
    id: row.friend_id,
    username: row.username || '',
    display_name: row.display_name || row.username || '',
    avatar_url: row.avatar_url
  }));

  const isAuthed = true; // Assuming user is authenticated if using this component

  // Search users when query is long enough and user is authenticated
  const { data: searchResults = [], isLoading: searchLoading } = useUserSearch(query, isAuthed)

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend =>
    friend.display_name?.toLowerCase().includes(query.toLowerCase()) ||
    friend.username?.toLowerCase().includes(query.toLowerCase())
  )

  // Merge friends and search results, avoiding duplicates
  const mergedResults = query.length > 2 
    ? [
        ...filteredFriends,
        ...searchResults.filter(user => 
          !filteredFriends.find(friend => friend.id === user.id)
        )
      ]
    : filteredFriends

  const isLoading = friendsLoading || searchLoading
  const isEmpty = !isLoading && mergedResults.length === 0

  const handleToggleFriend = (friendId: string) => {
    setSelected(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleConfirm = () => {
    onConfirm(selected)
    onClose()
  }

  const handleClose = () => {
    setSelected(initial)
    setQuery('')
    onClose()
  }

  if (!open) return null

  return (
    <WizardPortal onBackdropClick={handleClose}>
      <div 
        className="fixed bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-xl h-[80vh] flex flex-col"
        style={{ zIndex: 90 }} // Higher than wizard's z-index
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Invite Friends</h3>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {!isAuthed ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">Please sign in to invite friends</p>
              <Button onClick={() => window.location.href = '/auth'}>
                Sign In
              </Button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends and users..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Friends List */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 h-4 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : isEmpty ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{query.length > 2 ? 'No users found' : 'No friends found'}</p>
                    {query && query.length <= 2 && <p className="text-sm">Type at least 3 characters to search</p>}
                  </div>
                ) : (
                  mergedResults.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleToggleFriend(friend.id)}
                    >
                      <Checkbox
                        checked={selected.includes(friend.id)}
                        onChange={() => handleToggleFriend(friend.id)}
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>
                          {friend.display_name?.charAt(0)?.toUpperCase() || friend.username?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {friend.display_name || friend.username}
                        </p>
                        {friend.display_name && friend.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirm}
                className="w-full"
                disabled={selected.length === 0}
              >
                Invite {selected.length} {selected.length === 1 ? 'friend' : 'friends'}
              </Button>
            </>
          )}
        </div>
      </div>
    </WizardPortal>
  )
}
