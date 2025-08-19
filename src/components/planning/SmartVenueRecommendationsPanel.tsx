import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Users, 
  DollarSign, 
  Star, 
  TrendingUp,
  Calendar,
  Phone,
  ExternalLink,
  Heart,
  Filter,
  ChevronDown,
  Info,
  Navigation,
  Zap,
  Target,
  ThumbsUp,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  useSmartVenueRecommendations,
  SmartVenueRecommendation,
  RecommendationReason
} from '@/hooks/useSmartVenueRecommendations'
import { useCreatePlanStop } from '@/hooks/useCreatePlanStop'
import { cn } from '@/lib/utils'
import { format, addMinutes, parseISO } from 'date-fns'

interface SmartVenueRecommendationsPanelProps {
  planId: string
  centerLocation: { lat: number; lng: number }
  timeWindow: { start: string; end: string }
  planDate: string
  onVenueSelect?: (venue: SmartVenueRecommendation, timeSlot?: string) => void
  className?: string
}

const reasonTypeConfig = {
  vibe_match: { icon: Heart, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  cuisine_match: { icon: Star, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  group_size: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  budget: { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
  popularity: { icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  distance: { icon: Navigation, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  availability: { icon: Clock, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  crowd_optimal: { icon: Users, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  price_optimal: { icon: DollarSign, color: 'text-lime-600', bgColor: 'bg-lime-50' }
}

export function SmartVenueRecommendationsPanel({
  planId,
  centerLocation,
  timeWindow,
  planDate,
  onVenueSelect,
  className
}: SmartVenueRecommendationsPanelProps) {
  const [sortBy, setSortBy] = useState<'match_score' | 'popularity' | 'rating' | 'distance'>('match_score')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [vibeFilter, setVibeFilter] = useState<string>('all')
  const [showInsights, setShowInsights] = useState(true)

  const {
    recommendations,
    isLoading,
    error,
    participantInsights,
    getRecommendationsByCategory,
    getRecommendationsByVibe,
    getTopRecommendations
  } = useSmartVenueRecommendations({
    planId,
    centerLocation,
    timeWindow,
    planDate,
    maxDistance: 5000,
    limitResults: 15,
    preferences: {
      vibes: vibeFilter !== 'all' ? [vibeFilter] : undefined,
      crowdPreference: 'neutral'
    }
  })

  const createPlanStop = useCreatePlanStop()

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations

    if (categoryFilter !== 'all') {
      filtered = getRecommendationsByCategory(categoryFilter)
    }

    if (vibeFilter !== 'all') {
      filtered = getRecommendationsByVibe(vibeFilter)
    }

    return getTopRecommendations(sortBy, 10)
  }, [recommendations, categoryFilter, vibeFilter, sortBy, getRecommendationsByCategory, getRecommendationsByVibe, getTopRecommendations])

  const handleAddToTimeline = (venue: SmartVenueRecommendation, timeSlot?: string) => {
    const startTime = timeSlot || venue.optimal_time_slots[0]?.start_time || timeWindow.start
    const endTime = venue.optimal_time_slots[0]?.end_time || 
      format(addMinutes(parseISO(`${planDate}T${startTime}`), 90), 'HH:mm')

    createPlanStop.mutate({
      planId,
      venueId: venue.id,
      startTime,
      endTime,
      notes: `Added via smart recommendations - ${venue.match_score}% match`
    }, {
      onSuccess: () => {
        onVenueSelect?.(venue, timeSlot)
      }
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Recommendations Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load venue recommendations. Please try again later.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Recommendations ({filteredRecommendations.length})
          </CardTitle>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI-powered recommendations based on your group, preferences, and real-time venue data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Insights Overview */}
        <Collapsible open={showInsights} onOpenChange={setShowInsights}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2">
              <span className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Group Insights
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showInsights && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{participantInsights.groupSize}</div>
                <div className="text-sm text-blue-600">Group Size</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">
                  {participantInsights.isIntimateGroup ? 'Intimate' : 
                   participantInsights.isLargeGroup ? 'Large' : 'Medium'}
                </div>
                <div className="text-sm text-purple-600">Group Type</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              {participantInsights.hasGuests && '👥 Includes guests • '}
              Optimized for {participantInsights.preferredVibes.join(', ')} vibes
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Filters and Sorting */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match_score">Best Match</SelectItem>
              <SelectItem value="popularity">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="distance">Closest</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="restaurant">Restaurants</SelectItem>
              <SelectItem value="cafe">Cafes</SelectItem>
              <SelectItem value="bar">Bars</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vibeFilter} onValueChange={setVibeFilter}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Vibe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vibes</SelectItem>
              <SelectItem value="chill">Chill</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
              <SelectItem value="romantic">Romantic</SelectItem>
              <SelectItem value="cozy">Cozy</SelectItem>
              <SelectItem value="wild">Wild</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recommendations List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredRecommendations.map((recommendation, index) => (
              <VenueRecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                index={index}
                onAddToTimeline={handleAddToTimeline}
                isAdding={createPlanStop.isPending}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredRecommendations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No recommendations match your current filters
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Individual Venue Recommendation Card
function VenueRecommendationCard({
  recommendation,
  index,
  onAddToTimeline,
  isAdding
}: {
  recommendation: SmartVenueRecommendation
  index: number
  onAddToTimeline: (venue: SmartVenueRecommendation, timeSlot?: string) => void
  isAdding: boolean
}) {
  const [showDetails, setShowDetails] = useState(false)

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 55) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const topReasons = recommendation.match_reasons
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="border rounded-lg p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={recommendation.photo_url || ''} />
            <AvatarFallback>
              {recommendation.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{recommendation.name}</h3>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getMatchScoreColor(recommendation.match_score))}
              >
                {recommendation.match_score}% match
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {recommendation.distance_meters}m away
              </div>
              
              {recommendation.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {recommendation.rating.toFixed(1)}
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {recommendation.price_tier}
              </div>

              <Badge variant="secondary" className="text-xs">
                {recommendation.vibe}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {recommendation.travel_minutes} min walk
              {recommendation.availability_windows[0]?.booking_recommended && (
                <>
                  • <Phone className="h-3 w-3" />
                  Booking recommended
                </>
              )}
            </div>

            {/* Top Match Reasons */}
            <div className="flex flex-wrap gap-1">
              {topReasons.map((reason, idx) => {
                const config = reasonTypeConfig[reason.type]
                return (
                  <TooltipProvider key={idx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs">
                          <config.icon className="h-3 w-3 mr-1" />
                          {Math.round(reason.confidence)}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{reason.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>

            {/* Optimal Time Slots */}
            {recommendation.optimal_time_slots.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">Best times:</span>
                {recommendation.optimal_time_slots.slice(0, 2).map((slot, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {slot.start_time}-{slot.end_time}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button
            size="sm"
            onClick={() => onAddToTimeline(recommendation)}
            disabled={isAdding}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Add to Plan
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <VenueDetailsDialog recommendation={recommendation} />
          </Dialog>
        </div>
      </div>
    </motion.div>
  )
}

// Venue Details Dialog
function VenueDetailsDialog({ recommendation }: { recommendation: SmartVenueRecommendation }) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={recommendation.photo_url || ''} />
            <AvatarFallback>
              {recommendation.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {recommendation.name}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Match Score Breakdown */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Match Analysis ({recommendation.match_score}%)
          </h3>
          <div className="space-y-2">
            {recommendation.match_reasons.map((reason, idx) => {
              const config = reasonTypeConfig[reason.type]
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <config.icon className={cn("h-4 w-4", config.color)} />
                    <span className="text-sm">{reason.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={reason.confidence} className="w-20" />
                    <span className="text-xs font-medium">{Math.round(reason.confidence)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Optimal Time Slots */}
        {recommendation.optimal_time_slots.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Optimal Time Slots
            </h3>
            <div className="grid gap-2">
              {recommendation.optimal_time_slots.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{slot.start_time} - {slot.end_time}</div>
                    <div className="text-sm text-muted-foreground">
                      {slot.crowd_level} crowd • {slot.price_level} pricing
                    </div>
                  </div>
                  <Badge variant="outline">
                    {slot.confidence}% optimal
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crowd Prediction */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Crowd Intelligence
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Current Level</div>
              <div className="text-2xl font-bold capitalize text-blue-600">
                {recommendation.crowd_prediction.current_level}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium">Best Visit Time</div>
              <div className="text-2xl font-bold text-green-600">
                {recommendation.crowd_prediction.optimal_visit_time}
              </div>
            </div>
          </div>
          
          {recommendation.crowd_prediction.quiet_hours.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-1">Quiet Hours</div>
              <div className="flex gap-1">
                {recommendation.crowd_prediction.quiet_hours.map((hour, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {hour}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Venue Details */}
        <div>
          <h3 className="font-semibold mb-3">Venue Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Categories:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {recommendation.categories.map((cat, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            
            {recommendation.cuisines && recommendation.cuisines.length > 0 && (
              <div>
                <span className="font-medium">Cuisines:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {recommendation.cuisines.map((cuisine, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <span className="font-medium">Distance:</span>
              <div className="text-muted-foreground">
                {recommendation.distance_meters}m ({recommendation.travel_minutes} min walk)
              </div>
            </div>
            
            <div>
              <span className="font-medium">Price Tier:</span>
              <div className="text-muted-foreground">
                {recommendation.price_tier} • {recommendation.price_prediction.current_tier}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}