
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Tag, X } from 'lucide-react'
import { FriendPicker } from './FriendPicker'
import { useFriends } from '@/hooks/useFriends'
import { VibePill } from '@/components/floq/VibePill'

interface PlanDetails {
  title: string
  description?: string
  vibe_tag?: string
  invitedUserIds: string[]
}

interface Props {
  draft: PlanDetails
  onChange: (details: PlanDetails) => void
  onNext: () => void
  onBack?: () => void
}

const vibeOptions = [
  { label: 'Chill', value: 'chill' },
  { label: 'Hype', value: 'hype' },
  { label: 'Curious', value: 'curious' },
  { label: 'Social', value: 'social' },
  { label: 'Solo', value: 'solo' },
  { label: 'Romantic', value: 'romantic' },
  { label: 'Weird', value: 'weird' },
  { label: 'Down', value: 'down' },
  { label: 'Flowing', value: 'flowing' },
  { label: 'Open', value: 'open' },
]

export function DetailsStep({ draft, onChange, onNext, onBack }: Props) {
  const [details, setDetails] = useState(draft)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { profiles } = useFriends()

  const updateField = <K extends keyof PlanDetails>(field: K, value: PlanDetails[K]) => {
    const updated = { ...details, [field]: value }
    setDetails(updated)
    onChange(updated)
  }

  const handleVibeToggle = (vibe: string) => {
    const newVibe = details.vibe_tag === vibe ? '' : vibe
    updateField('vibe_tag', newVibe)
  }

  const handleNext = () => {
    if (!details.title.trim()) return
    onNext()
  }

  const handleInviteFriends = (friendIds: string[]) => {
    updateField('invitedUserIds', friendIds)
  }

  const removeFriend = (friendId: string) => {
    const updated = details.invitedUserIds.filter(id => id !== friendId)
    updateField('invitedUserIds', updated)
  }

  const getInvitedFriends = () => {
    return profiles.filter(profile => details.invitedUserIds.includes(profile.id))
  }

  return (
    <div className="space-y-6">
      {/* Plan Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-medium">
          Plan Title *
        </Label>
        <Input
          id="title"
          placeholder="What's the plan?"
          value={details.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="text-lg"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Tell us more about what you're planning..."
          value={details.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Vibe Tag */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Vibe
        </Label>
        <div className="flex flex-wrap gap-2">
          {vibeOptions.map((option) => (
            <div
              key={option.value}
              className={`cursor-pointer transition-all duration-200 ${
                details.vibe_tag === option.value ? 'scale-105' : 'hover:scale-105 opacity-70'
              }`}
              onClick={() => handleVibeToggle(option.value)}
            >
              <VibePill 
                vibe={option.value as any}
                className={details.vibe_tag === option.value ? '' : 'opacity-70'}
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          This helps Nova AI suggest better stops for your plan
        </p>
      </div>

      {/* Invite Friends */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Invite Friends
        </Label>
        <div className="rounded-xl border border-dashed border-muted p-4">
          {details.invitedUserIds.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-3">
              Nobody invited yet – add friends below
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {getInvitedFriends().map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 bg-accent rounded-full pl-1 pr-3 py-1"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {friend.display_name?.charAt(0)?.toUpperCase() || friend.username?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {friend.display_name || friend.username}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeFriend(friend.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            + Invite friends
          </Button>
        </div>
      </div>

      <FriendPicker
        open={pickerOpen}
        initial={details.invitedUserIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleInviteFriends}
      />

      {/* Next Button */}
      <Button 
        onClick={handleNext} 
        className="w-full" 
        size="lg"
        disabled={!details.title.trim()}
      >
        Review Plan
      </Button>
    </div>
  )
}
