import React from 'react'
import { ArrowLeft, Heart, Users, MessageCircle, MapPin, Calendar, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FriendRelationshipStrength } from '@/components/ui/FriendRelationshipStrength'
import { useNavigate } from 'react-router-dom'

const FriendProfileDemo = () => {
  const navigate = useNavigate()

  // Mock data for demo
  const mockFriendData = {
    friendId: '1',
    friendName: 'Sarah Chen',
    avatarUrl: undefined,
    overallStrength: 85,
    attributes: {
      interactionFrequency: 78,
      mutualFriends: 12,
      sharedInterests: 85,
      messageActivity: 65,
      locationOverlap: 72,
      timeSpentTogether: 80
    },
    isPublic: true
  }

  const handleTogglePrivacy = (isPublic: boolean) => {
    console.log(`Relationship privacy changed to: ${isPublic ? 'public' : 'private'}`)
    // In production, this would update the database
  }

  return (
    <div className="min-h-screen bg-gradient-field p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 w-8 p-0 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-white">Friend Profile Demo</h1>
        </div>

        {/* Friend Profile Header */}
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">
                {mockFriendData.friendName.charAt(0)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{mockFriendData.friendName}</h2>
            <p className="text-white/70 text-sm">@sarah_chen</p>
            
            {/* Quick stats */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-white font-bold">12</div>
                <div className="text-white/50 text-xs">Mutual Friends</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">85%</div>
                <div className="text-white/50 text-xs">Relationship</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">3</div>
                <div className="text-white/50 text-xs">Shared Interests</div>
              </div>
            </div>
          </div>
        </div>

        {/* Relationship Strength Component */}
        <FriendRelationshipStrength
          friendId={mockFriendData.friendId}
          friendName={mockFriendData.friendName}
          avatarUrl={mockFriendData.avatarUrl}
          overallStrength={mockFriendData.overallStrength}
          attributes={mockFriendData.attributes}
          isPublic={mockFriendData.isPublic}
          onTogglePrivacy={handleTogglePrivacy}
        />

        {/* Demo Info */}
        <div className="mt-6 bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
          <h3 className="text-white font-semibold mb-3">Demo Features</h3>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span>Overall relationship strength with visual indicators</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Detailed relationship attributes breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-400" />
              <span>Privacy controls for relationship visibility</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>AI-powered relationship insights</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Mutual friends and shared interests</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FriendProfileDemo 