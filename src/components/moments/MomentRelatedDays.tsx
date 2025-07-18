import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, MapPin, Users, Sparkles, ExternalLink } from 'lucide-react'
import { AfterglowMoment } from '@/hooks/useAfterglowData'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { formatMomentTime } from '@/utils/afterglowHelpers'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface MomentRelatedDaysProps {
  moment: AfterglowMoment
}

interface RelatedMoment {
  id: string
  date: string
  title: string
  description?: string
  moment_type: string
  timestamp: string
  color: string
  similarity_score: number
  afterglow_id: string
  afterglow_summary: string
}

export function MomentRelatedDays({ moment }: MomentRelatedDaysProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'location' | 'people' | 'vibe'>('all')

  // Find related moments across different days
  const { data: relatedMoments, isLoading } = useQuery({
    queryKey: ['related-moments', moment.title, moment.metadata],
    queryFn: async (): Promise<RelatedMoment[]> => {
      if (!user) return []

      // Build search criteria based on moment metadata
      const searchCriteria = []
      
      // Location-based similarity
      if (moment.metadata?.location?.venue_name) {
        searchCriteria.push(`venue:"${moment.metadata.location.venue_name}"`)
      }
      
      // Vibe-based similarity
      if (moment.metadata?.vibe) {
        searchCriteria.push(`vibe:"${moment.metadata.vibe}"`)
      }
      
      // People-based similarity (if any known people)
      if (moment.metadata?.people?.encountered_users?.length > 0) {
        const userIds = moment.metadata.people.encountered_users.map((u: any) => u.id)
        searchCriteria.push(`people:${userIds.join(',')}`)
      }
      
      // Activity type similarity
      if (moment.metadata?.social_context?.activity_type) {
        searchCriteria.push(`activity:"${moment.metadata.social_context.activity_type}"`)
      }

      if (searchCriteria.length === 0) {
        // Fallback to title-based search
        const titleWords = moment.title.split(' ').filter(word => word.length > 2)
        if (titleWords.length > 0) {
          searchCriteria.push(`title:"${titleWords[0]}"`)
        }
      }

      const { data, error } = await supabase
        .from('afterglow_moments')
        .select(`
          id,
          title,
          description,
          moment_type,
          timestamp,
          color,
          metadata,
          daily_afterglow!inner(
            id,
            date,
            summary_text,
            user_id
          )
        `)
        .eq('daily_afterglow.user_id', user.id)
        .neq('id', moment.id) // Exclude current moment
        .limit(10)

      if (error) throw error

      // Calculate similarity scores and format results
      const results: RelatedMoment[] = (data || []).map((item: any) => {
        let similarityScore = 0
        
        // Location similarity
        if (moment.metadata?.location?.venue_name && 
            item.metadata?.location?.venue_name === moment.metadata.location.venue_name) {
          similarityScore += 0.4
        }
        
        // Vibe similarity
        if (moment.metadata?.vibe && item.metadata?.vibe === moment.metadata.vibe) {
          similarityScore += 0.3
        }
        
        // Time of day similarity (within 2 hours)
        const momentHour = new Date(moment.timestamp).getHours()
        const itemHour = new Date(item.timestamp).getHours()
        if (Math.abs(momentHour - itemHour) <= 2) {
          similarityScore += 0.2
        }
        
        // Activity type similarity
        if (moment.metadata?.social_context?.activity_type && 
            item.metadata?.social_context?.activity_type === moment.metadata.social_context.activity_type) {
          similarityScore += 0.1
        }

        return {
          id: item.id,
          date: item.daily_afterglow.date,
          title: item.title,
          description: item.description,
          moment_type: item.moment_type,
          timestamp: item.timestamp,
          color: item.color,
          similarity_score: similarityScore,
          afterglow_id: item.daily_afterglow.id,
          afterglow_summary: item.daily_afterglow.summary_text
        }
      })

      // Sort by similarity score and return top matches
      return results
        .filter(r => r.similarity_score > 0.1) // Only include meaningful matches
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, 6)
    },
    enabled: !!user
  })

  const filteredMoments = relatedMoments?.filter(relatedMoment => {
    if (selectedFilter === 'all') return true
    
    if (selectedFilter === 'location') {
      return moment.metadata?.location?.venue_name && 
             relatedMoment.similarity_score >= 0.3 // Location contributes 0.4 max
    }
    
    if (selectedFilter === 'people') {
      return moment.metadata?.people && relatedMoment.similarity_score >= 0.2
    }
    
    if (selectedFilter === 'vibe') {
      return moment.metadata?.vibe && relatedMoment.similarity_score >= 0.2
    }
    
    return true
  })

  const handleViewAfterglow = (afterglowId: string) => {
    navigate(`/afterglow/${afterglowId}`)
  }

  const getSimilarityBadge = (score: number) => {
    if (score >= 0.7) return { label: 'Very Similar', variant: 'default' as const }
    if (score >= 0.4) return { label: 'Similar', variant: 'secondary' as const }
    return { label: 'Related', variant: 'outline' as const }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {['All', 'Location', 'People', 'Vibe'].map((filter) => (
            <Skeleton key={filter} className="h-8 w-16" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Related Moments</h3>
        <p className="text-sm text-muted-foreground">
          Similar moments from other days based on location, people, vibe, and activities
        </p>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All', icon: Sparkles },
          { key: 'location', label: 'Location', icon: MapPin },
          { key: 'people', label: 'People', icon: Users },
          { key: 'vibe', label: 'Vibe', icon: Sparkles }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={selectedFilter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter(key as any)}
            className="gap-2"
          >
            <Icon className="w-3 h-3" />
            {label}
          </Button>
        ))}
      </div>

      {/* Related moments */}
      {filteredMoments && filteredMoments.length > 0 ? (
        <motion.div layout className="space-y-4">
          {filteredMoments.map((relatedMoment, index) => {
            const similarityBadge = getSimilarityBadge(relatedMoment.similarity_score)
            
            return (
              <motion.div
                key={relatedMoment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: relatedMoment.color }}
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{relatedMoment.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(relatedMoment.date).toLocaleDateString()} · {formatMomentTime(relatedMoment.timestamp)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={similarityBadge.variant} className="text-xs">
                            {similarityBadge.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAfterglow(relatedMoment.afterglow_id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {relatedMoment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedMoment.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        From: {relatedMoment.afterglow_summary}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No related moments found</p>
          <p className="text-sm">This appears to be a unique experience!</p>
        </div>
      )}
    </div>
  )
}