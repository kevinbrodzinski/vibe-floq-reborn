import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useResolvePlanSlug } from '@/hooks/useResolvePlanSlug'
import { useJoinPlan } from '@/hooks/useJoinPlan'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Loader2, Calendar, MapPin, Users, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { VibeRing } from '@/components/VibeRing'
import { safeVibe } from '@/utils/safeVibe'

interface PlanParticipant {
  id: string
  display_name?: string
  username: string
  avatar_url?: string
  current_vibe?: string
}

export function PlanInvite() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { data: resolution, isLoading: resolutionLoading } = useResolvePlanSlug(slug)
  
  // Get plan details
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['plan-details', resolution?.plan_id],
    enabled: !!resolution?.plan_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          id,
          title,
          description,
          planned_at,
          vibe_tag,
          location,
          floq_id,
          creator:profiles!inner(id, display_name, username, avatar_url)
        `)
        .eq('id', resolution!.plan_id)
        .maybeSingle()

      if (error) throw error
      return data
    }
  })

  // Get participants
  const { data: participants, isLoading: participantsLoading, refetch: refetchParticipants } = useQuery({
    queryKey: ['plan-participants', resolution?.plan_id],
    enabled: !!resolution?.plan_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          user_id,
          profiles!profile_id(id, display_name, username, avatar_url)
        `)
        .eq('plan_id', resolution!.plan_id)

      if (error) throw error
      
      return data?.map(p => (p as any).profiles).filter(Boolean) as PlanParticipant[]
    }
  })

  // Check if user is already joined
  const isJoined = participants?.some(p => p.id === user?.id) || false

  const joinPlanMutation = useJoinPlan(resolution?.plan_id)

  const handleJoinPlan = async () => {
    if (!user) {
      navigate('/auth/login')
      return
    }
    
    await joinPlanMutation.mutateAsync()
    refetchParticipants()
  }

  const handleViewPlan = () => {
    navigate(`/plans/${resolution?.plan_id}`)
  }

  if (resolutionLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading plan details...</p>
        </div>
      </div>
    )
  }

  if (!resolution || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Plan Not Found</h1>
            <p className="text-muted-foreground mb-4">
              This plan link might be invalid or the plan has been removed.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-md mx-auto px-4 py-8 space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <h1 className="text-lg font-semibold">You're Invited!</h1>
          </div>
          <p className="text-sm text-muted-foreground">Join this collaborative plan</p>
        </motion.div>

        {/* Plan Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-2 border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground">{plan.title}</h2>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  )}
                </div>
                {plan.vibe_tag && (
                  <Badge variant="secondary" className="ml-2 capitalize">
                    {plan.vibe_tag}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              {/* Plan Details */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {plan.planned_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(plan.planned_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{participants?.length || 0} participant{participants?.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Participants */}
              {participants && participants.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Who's going</h3>
                  <div className="flex -space-x-2 overflow-hidden">
                    {participants.slice(0, 6).map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        <VibeRing vibe={safeVibe(participant.current_vibe || plan.vibe_tag)} className="w-10 h-10">
                          <Avatar className="w-8 h-8 border-2 border-background">
                            <AvatarImage src={participant.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {participant.display_name?.[0] || participant.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </VibeRing>
                      </motion.div>
                    ))}
                    {participants.length > 6 && (
                      <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-medium">+{participants.length - 6}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Join Status */}
              {isJoined && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">✅ You're part of this plan</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isJoined ? (
            <Button 
              onClick={handleViewPlan}
              className="w-full h-12 text-base"
              size="lg"
            >
              View Full Plan
            </Button>
          ) : (
            <Button 
              onClick={handleJoinPlan}
              disabled={joinPlanMutation.isPending || participantsLoading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {joinPlanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Plan'
              )}
            </Button>
          )}
        </motion.div>

        {/* Creator Info */}
        {plan.creator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs text-muted-foreground"
          >
            Plan created by {(plan.creator as any)?.display_name || (plan.creator as any)?.username}
          </motion.div>
        )}
      </div>
    </div>
  )
}