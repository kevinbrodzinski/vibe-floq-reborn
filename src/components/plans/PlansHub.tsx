import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Users, Clock, Archive, Play, Flag, Pencil, CheckCircle } from 'lucide-react'
import { useUserPlans } from '@/hooks/useUserPlans'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function PlansHub() {
  const navigate = useNavigate()
  const { plansByStatus, stats, isLoading } = useUserPlans()
  const [showArchived, setShowArchived] = useState(false)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'draft': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'closed': return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }, [])

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />
      case 'draft': return <Pencil className="w-4 h-4" />
      case 'closed': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <Archive className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }, [])

  const sectionsToShow = useMemo(() => {
    const sections = [
      { key: 'active', title: 'Active', plans: plansByStatus.active },
      { key: 'draft', title: 'Draft', plans: plansByStatus.draft },
      { key: 'closed', title: 'Completed', plans: plansByStatus.closed },
    ]

    if (showArchived && plansByStatus.cancelled) {
      sections.push({ key: 'cancelled', title: 'Cancelled', plans: plansByStatus.cancelled })
    }

    return sections
  }, [plansByStatus, showArchived])

  const computedStats = useMemo(() => {
    const activeTotal = stats.draft + stats.active
    const total = Object.values(stats).reduce((a, b) => a + b, 0)
    return { ...stats, activeTotal, total }
  }, [stats])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Plans</h1>
          <p className="text-muted-foreground">Manage and track all your plans</p>
        </div>
        <Button onClick={() => navigate('/plan/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          New Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Draft</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{stats.closed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{computedStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans by Status */}
      {sectionsToShow.map(({ key, title, plans }) => (
        <div key={key} className="space-y-4">
          {plans.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{title}</h2>
                <Badge variant="secondary">{plans.length}</Badge>
              </div>
              
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{plan.title}</h3>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs border", getStatusColor(plan.status))}
                              aria-label={plan.status}
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIcon(plan.status)}
                                {plan.status}
                              </div>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {plan.planned_at ? format(new Date(plan.planned_at), 'PPP') : 'No date set'}
                            </span>
                            
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {plan.participant_count} participant{plan.participant_count !== 1 ? 's' : ''}
                            </span>
                            
                            {plan.stops_count > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {plan.stops_count} stop{plan.stops_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {plan.vibe_tag && (
                            <Badge variant="secondary" className="w-fit">
                              {plan.vibe_tag}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      ))}

      {/* Show Cancelled Toggle */}
      {stats.cancelled > 0 && (
        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Hide' : 'Show'} Cancelled Plans ({stats.cancelled})
          </Button>
        </div>
      )}

      {/* Empty State */}
      {Object.values(plansByStatus).every(plans => plans.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first plan to start organizing memorable experiences
            </p>
            <Button onClick={() => navigate('/plan/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}