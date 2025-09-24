import React from 'react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Calendar, MessageCircle, MapPin, Home, Share } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { track } from '@/lib/analytics'

export default function RecapActionSheet() {
  const navigate = useNavigate()
  const exploreBeta = useFeatureFlag('EXPLORE')

  const handleAction = (action: string, path: string) => {
    track('recap_action', { action })
    navigate(path, { replace: true })
  }

  // Build actions array with feature flag guard
  const actions = [
    {
      icon: Calendar,
      label: "View today's plans",
      description: "See what's coming up",
      action: 'view_plans',
      path: '/plans',
      variant: 'default' as const
    },
    {
      icon: MessageCircle,
      label: "Check messages",
      description: "Catch up with your floqs",
      action: 'check_messages',
      path: '/messages',
      variant: 'outline' as const
    },
    ...(exploreBeta ? [{
      icon: MapPin,
      label: "Explore nearby",
      description: "Discover trending spots",
      action: 'explore_nearby',
      path: '/explore',
      variant: 'outline' as const
    }] : []),
    {
      icon: Share,
      label: "Share yesterday",
      description: "Tell your story",
      action: 'share_recap',
      path: '/afterglow',
      variant: 'outline' as const
    }
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Ready for today?</h1>
          <p className="text-sm text-muted-foreground">
            Pick your next move
          </p>
        </div>
        
        <div className="space-y-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={() => handleAction(action.action, action.path)}
              variant={action.variant}
              className="w-full justify-start h-auto p-4"
            >
              <div className="flex items-center gap-3">
                <action.icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>

        <Button 
          onClick={() => {
            track('recap_action', { action: 'go_home' })
            navigate('/home', { replace: true })
          }}
          variant="ghost" 
          className="w-full"
        >
          <Home className="w-4 h-4 mr-2" />
          Just take me home
        </Button>
      </div>
    </div>
  )
}