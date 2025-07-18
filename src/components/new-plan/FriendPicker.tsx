import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { useFriends } from '@/hooks/useFriends'

interface FriendPickerProps {
  open: boolean
  initial?: string[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

export function FriendPicker({ open, initial = [], onClose, onConfirm }: FriendPickerProps) {
  const { profiles } = useFriends()
  const [selected, setSelected] = useState<string[]>(initial)
  const [query, setQuery] = useState('')

  const friendsFiltered = profiles.filter(friend =>
    friend.display_name?.toLowerCase().includes(query.toLowerCase()) ||
    friend.username?.toLowerCase().includes(query.toLowerCase())
  )

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

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Invite Friends</SheetTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {friendsFiltered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No friends found</p>
              {query && <p className="text-sm">Try a different search term</p>}
            </div>
          ) : (
            friendsFiltered.map((friend) => (
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
      </SheetContent>
    </Sheet>
  )
}