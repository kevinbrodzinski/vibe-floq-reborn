import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Input } from '@/components/ui/input'
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { UserSearchResults } from '@/components/UserSearchResults'
import { useFriendDiscovery } from '@/hooks/useFriendDiscovery'
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { useInvalidateDiscover } from '@/hooks/useInvalidateDiscover'
import { supabase } from '@/integrations/supabase/client'

export function DiscoverSheet() {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { data: searchResults, isLoading } = useFriendDiscovery(searchQuery)
  const { sendRequest, updating } = useUnifiedFriends()
  const { toast } = useToast()

  // Auto-focus the search input when sheet opens
  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus()
    }, 100) // Small delay to ensure sheet is fully mounted
    
    return () => clearTimeout(timeout)
  }, [])

  // Keyboard shortcut to focus search bar
  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    inputRef.current?.focus()
  }, { enableOnFormTags: true })

  const handleAddFriend = async (profileId: string) => {
    try {
      await sendRequest(profileId)
      toast({
        title: 'Friend request sent!',
        description: 'Your request has been sent successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send friend request',
        variant: 'destructive'
      })
    }
  }

  return (
    <SheetContent side="left" className="max-w-sm w-full p-6 space-y-6">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Discover People
        </SheetTitle>
        <SheetDescription>
          Search for new friends by name or username to expand your social network
        </SheetDescription>
      </SheetHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search by name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.length >= 2 ? (
          <UserSearchResults
            users={searchResults || []}
            searchQuery={searchQuery}
            isLoading={isLoading || updating}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start typing to discover people</p>
            <p className="text-sm mt-1">Search by name or username</p>
          </div>
        )}
      </div>
    </SheetContent>
  )
}