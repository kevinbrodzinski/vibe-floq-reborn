import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Check, 
  X, 
  Clock, 
  HelpCircle, 
  Crown, 
  Shield, 
  MessageSquare,
  Send,
  ChevronDown,
  Filter,
  Search,
  UserX,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  usePlanParticipants, 
  useInviteParticipant, 
  useUpdateRSVP, 
  useRemoveParticipant,
  useParticipantStats,
  useRealtimePlanParticipants,
  validateParticipantData,
  PlanParticipant,
  RSVPStatus,
  PlanRole
} from '@/hooks/usePlanParticipants'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface PlanParticipantsPanelProps {
  planId: string
  isCreator: boolean
  className?: string
}

const rsvpStatusConfig = {
  accepted: { 
    icon: Check, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 border-green-200',
    label: 'Accepted',
    badgeVariant: 'default' as const
  },
  declined: { 
    icon: X, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 border-red-200',
    label: 'Declined',
    badgeVariant: 'destructive' as const
  },
  pending: { 
    icon: Clock, 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Pending',
    badgeVariant: 'secondary' as const
  },
  maybe: { 
    icon: HelpCircle, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Maybe',
    badgeVariant: 'outline' as const
  }
}

const roleConfig = {
  creator: { icon: Crown, color: 'text-purple-600', label: 'Creator' },
  co_admin: { icon: Shield, color: 'text-blue-600', label: 'Co-Admin' },
  participant: { icon: Users, color: 'text-gray-600', label: 'Participant' }
}

export function PlanParticipantsPanel({ planId, isCreator, className }: PlanParticipantsPanelProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RSVPStatus | 'all'>('all')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showStats, setShowStats] = useState(true)

  // Hooks
  const { data: participants = [], isLoading } = usePlanParticipants(planId)
  const stats = useParticipantStats(planId)
  const inviteParticipant = useInviteParticipant()
  const updateRSVP = useUpdateRSVP()
  const removeParticipant = useRemoveParticipant()
  
  // Enable real-time updates
  useRealtimePlanParticipants(planId)

  // Current user's participant record
  const currentUserParticipant = (participants as any[]).find(p => p.profile_id === user?.id)

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return (participants as any[]).filter(participant => {
      const matchesSearch = searchQuery === '' || 
        (participant.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (participant.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (participant.guest_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (participant.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || participant.rsvp_status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [participants, searchQuery, statusFilter])

  const handleRSVPUpdate = (status: RSVPStatus, notes?: string) => {
    if (!currentUserParticipant) return
    
    updateRSVP.mutate({
      participantId: currentUserParticipant.id,
      planId,
      status,
      notes
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({stats.total})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isCreator && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Button>
                </DialogTrigger>
                <InviteParticipantDialog 
                  planId={planId} 
                  onClose={() => setShowInviteDialog(false)} 
                />
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <Collapsible open={showStats} onOpenChange={setShowStats}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2">
              <span className="font-medium">Overview</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showStats && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
                <div className="text-sm text-green-600">Accepted</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
                <div className="text-sm text-yellow-600">Pending</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{stats.maybe}</div>
                <div className="text-sm text-blue-600">Maybe</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{stats.declined}</div>
                <div className="text-sm text-red-600">Declined</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <div>{stats.acceptanceRate}% acceptance rate • {stats.responseRate}% response rate</div>
              <div>{stats.guests} guests • {stats.members} members</div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RSVPStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="maybe">Maybe</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Current User RSVP */}
        {currentUserParticipant && currentUserParticipant.rsvp_status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-blue-900">Your RSVP</div>
              <Badge variant="secondary">Pending Response</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleRSVPUpdate('accepted')}
                className="bg-green-600 hover:bg-green-700"
                disabled={updateRSVP.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRSVPUpdate('maybe')}
                disabled={updateRSVP.isPending}
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Maybe
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRSVPUpdate('declined')}
                disabled={updateRSVP.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          </motion.div>
        )}

        {/* Participants List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredParticipants.map((participant, index) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                planId={planId}
                isCreator={isCreator}
                currentUserId={user?.id}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || statusFilter !== 'all' 
              ? 'No participants match your filters'
              : 'No participants yet'
            }
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Individual Participant Card Component
function ParticipantCard({ 
  participant, 
  planId, 
  isCreator, 
  currentUserId, 
  index 
}: { 
  participant: PlanParticipant
  planId: string
  isCreator: boolean
  currentUserId?: string
  index: number
}) {
  const removeParticipant = useRemoveParticipant()
  const statusConfig = rsvpStatusConfig[participant.rsvp_status]
  const roleInfo = roleConfig[participant.role]
  
  const isCurrentUser = participant.profile_id === currentUserId
  const canRemove = isCreator && !isCurrentUser && participant.role !== 'creator'

  const handleRemove = () => {
    removeParticipant.mutate({ 
      participantId: participant.id, 
      planId 
    })
  }

  // Display name logic
  const displayName = participant.is_guest 
    ? participant.guest_name 
    : participant.profile?.display_name

  const displayUsername = participant.is_guest 
    ? null 
    : participant.profile?.username

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-4 rounded-lg border transition-colors",
        statusConfig.bgColor
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={participant.profile?.avatar_url || ''} />
            <AvatarFallback>
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {displayName || 'Unknown'}
              </span>
              
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
              
              <div className="flex items-center gap-1">
                <roleInfo.icon className={cn("h-3 w-3", roleInfo.color)} />
              </div>
              
              {participant.is_guest && (
                <Badge variant="secondary" className="text-xs">Guest</Badge>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {participant.is_guest ? (
                <div className="flex items-center gap-4">
                  {participant.guest_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {participant.guest_email}
                    </div>
                  )}
                  {participant.guest_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {participant.guest_phone}
                    </div>
                  )}
                </div>
              ) : (
                displayUsername && `@${displayUsername}`
              )}
            </div>
            
            {participant.notes && (
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {participant.notes}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <Badge variant={statusConfig.badgeVariant} className="mb-1">
              <statusConfig.icon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            
            <div className="text-xs text-muted-foreground">
              {participant.responded_at ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {format(new Date(participant.responded_at), 'MMM d')}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-600" />
                  {format(new Date(participant.invited_at), 'MMM d')}
                </div>
              )}
            </div>
          </div>

          {canRemove && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleRemove}
                  className="text-red-600 focus:text-red-600"
                  disabled={removeParticipant.isPending}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Invite Participant Dialog Component
function InviteParticipantDialog({ planId, onClose }: { planId: string, onClose: () => void }) {
  const [inviteType, setInviteType] = useState<'member' | 'guest'>('member')
  const [formData, setFormData] = useState({
    profileId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    role: 'participant' as PlanRole,
    notes: ''
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const inviteParticipant = useInviteParticipant()

  const validateForm = () => {
    const data = {
      planId,
      isGuest: inviteType === 'guest',
      role: formData.role,
      notes: formData.notes,
      ...(inviteType === 'guest' ? {
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone
      } : {
        profileId: formData.profileId
      })
    }

    const errors = validateParticipantData(data)
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const inviteData = {
      planId,
      isGuest: inviteType === 'guest',
      role: formData.role,
      notes: formData.notes || undefined,
      ...(inviteType === 'guest' ? {
        guestName: formData.guestName,
        guestEmail: formData.guestEmail || undefined,
        guestPhone: formData.guestPhone || undefined
      } : {
        profileId: formData.profileId
      })
    }

    inviteParticipant.mutate(inviteData, {
      onSuccess: () => {
        onClose()
        setFormData({
          profileId: '',
          guestName: '',
          guestEmail: '',
          guestPhone: '',
          role: 'participant',
          notes: ''
        })
        setValidationErrors([])
      }
    })
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Participant
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Please fix the following errors:</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <span>•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Invite Type Selection */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={inviteType === 'member' ? 'default' : 'outline'}
            onClick={() => setInviteType('member')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Floq Member
          </Button>
          <Button
            type="button"
            variant={inviteType === 'guest' ? 'default' : 'outline'}
            onClick={() => setInviteType('guest')}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-2" />
            Guest
          </Button>
        </div>

        {/* Member Invite Fields */}
        {inviteType === 'member' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="profileId">Member Username or ID *</Label>
              <Input
                id="profileId"
                value={formData.profileId}
                onChange={(e) => setFormData(prev => ({ ...prev, profileId: e.target.value }))}
                placeholder="Enter username or profile ID"
                required
              />
            </div>
          </div>
        )}

        {/* Guest Invite Fields */}
        {inviteType === 'guest' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="guestName">Name *</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                placeholder="Guest's full name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                type="email"
                value={formData.guestEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, guestEmail: e.target.value }))}
                placeholder="guest@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="guestPhone">Phone</Label>
              <Input
                id="guestPhone"
                type="tel"
                value={formData.guestPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, guestPhone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        )}

        {/* Role Selection */}
        <div>
          <Label htmlFor="role">Role</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as PlanRole }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participant">Participant</SelectItem>
              <SelectItem value="co_admin">Co-Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add a personal message or note..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={inviteParticipant.isPending}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {inviteParticipant.isPending ? 'Sending...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}