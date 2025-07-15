import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePing } from '@/hooks/usePing'
import { SocialSuggestion } from '@/hooks/useSocialSuggestions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Waves } from 'lucide-react'

interface Props { 
  suggestion: SocialSuggestion 
}

export const SuggestionCard: React.FC<Props> = ({ suggestion }) => {
  const ping = usePing()

  const getVibeColor = (vibe: string) => {
    switch (vibe) {
      case 'chill': return 'bg-blue-500'
      case 'flowing': return 'bg-cyan-500'
      case 'hype': return 'bg-purple-500'
      case 'social': return 'bg-green-500'
      case 'romantic': return 'bg-pink-500'
      default: return 'bg-gray-500'
    }
  }

  const matchPercentage = Math.round(suggestion.vibe_match * 100)
  const distance = Math.round(suggestion.distance_m)

  return (
    <Card className="w-56 flex-shrink-0 mr-4 animate-scale-in">
      <CardContent className="flex flex-col items-center p-4 space-y-3">
        <Avatar className="w-14 h-14">
          <AvatarImage src={suggestion.avatar_url || undefined} />
          <AvatarFallback>
            {suggestion.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center space-y-1">
          <p className="font-medium text-sm">{suggestion.display_name}</p>
          <div className="flex items-center justify-center gap-2">
            <Badge 
              className={`text-xs px-2 py-1 text-white ${getVibeColor(suggestion.vibe_tag)}`}
            >
              {suggestion.vibe_tag}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {matchPercentage}% match
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {distance}m away
          </p>
        </div>

        <div className="flex gap-2 w-full">
          <Button 
            size="sm" 
            onClick={() => ping(suggestion.friend_id)}
            className="flex-1"
          >
            <Waves className="w-4 h-4 mr-1" />
            Wave
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.location.hash = `#/dm/${suggestion.friend_id}`}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            DM
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}