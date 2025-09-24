import { useSocialSuggestions } from '@/hooks/useSocialSuggestions'
import { SuggestionCard } from './SuggestionCard'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Loader2 } from 'lucide-react'
import { ZFriend, zIndex } from '@/constants/z'

export const FriendSuggestionCarousel: React.FC = () => {
  const { suggestions, loading } = useSocialSuggestions()

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Finding nearby friends...</span>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <Card className="mb-4 animate-fade-in" {...zIndex('uiInteractive')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" />
          Friends Nearby
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
            {suggestions.length}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea>
          <div className="flex gap-4 pb-4">
            {suggestions.map(suggestion => (
              <SuggestionCard 
                key={suggestion.id || suggestion.friend_id} 
                suggestion={suggestion} 
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}