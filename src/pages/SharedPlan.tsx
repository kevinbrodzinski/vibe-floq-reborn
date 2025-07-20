
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useResolvePlanSlug } from '@/hooks/useResolvePlanSlug';
import { useTrackPlanShareClick } from '@/hooks/useTrackPlanShareClick';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { LoginToJoinModal } from '@/components/modals/LoginToJoinModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { SharePlanButton } from '@/components/planning/SharePlanButton';

export default function SharedPlan() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const { data: planId, isLoading: resolving } = useResolvePlanSlug(slug!);
  
  // Track the click for analytics
  useTrackPlanShareClick(slug);

  // Fetch plan details
  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('floq_plans')
          .select(`
            *,
            floqs (
              title,
              description,
              primary_vibe,
              location,
              starts_at
            ),
            plan_participants (
              user_id,
              profiles (
                username,
                display_name,
                avatar_url
              )
            )
          `)
          .eq('id', planId)
          .single();

        if (error) throw error;
        setPlan(data);
      } catch (error) {
        console.error('Error fetching plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  const handleJoinPlan = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!planId) return;

    setJoining(true);
    try {
      const { error } = await supabase
        .from('plan_participants')
        .insert({
          plan_id: planId,
          user_id: user.id,
        });

      if (error) throw error;

      // Navigate to the collaborative planning screen
      navigate(`/plan/${planId}`);
    } catch (error) {
      console.error('Error joining plan:', error);
    } finally {
      setJoining(false);
    }
  };

  if (resolving || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!planId || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Plan not found</h1>
          <p className="text-muted-foreground">This link may be broken or expired.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isParticipant = plan.plan_participants?.some((p: any) => p.user_id === user?.id);
  const participantCount = plan.plan_participants?.length || 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Plan Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{plan.title}</CardTitle>
                {plan.description && (
                  <p className="text-muted-foreground">{plan.description}</p>
                )}
              </div>
              <SharePlanButton planId={planId} variant="outline" size="sm" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Plan Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {plan.planned_at ? new Date(plan.planned_at).toLocaleDateString() : 'Date TBD'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {plan.start_time || 'Time TBD'}
                </span>
              </div>
              
              {plan.floqs?.location && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Location set</span>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {participantCount} {participantCount === 1 ? 'person' : 'people'} interested
              </span>
            </div>

            {/* Join/View Button */}
            {!isParticipant ? (
              <Button 
                onClick={handleJoinPlan} 
                disabled={joining}
                className="w-full"
              >
                {joining ? 'Joining...' : 'Join This Plan'}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-green-600 font-medium">✓ You're part of this plan</p>
                <Button 
                  onClick={() => navigate(`/plan/${planId}`)}
                  className="w-full"
                >
                  View Full Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participant List */}
        {plan.plan_participants && plan.plan_participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Who's Going</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plan.plan_participants.map((participant: any) => (
                  <div key={participant.user_id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {participant.profiles?.avatar_url ? (
                        <img 
                          src={participant.profiles.avatar_url} 
                          alt={participant.profiles.display_name || participant.profiles.username}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {(participant.profiles?.display_name || participant.profiles?.username || 'Anonymous')[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm">
                      {participant.profiles?.display_name || participant.profiles?.username || 'Anonymous'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <LoginToJoinModal 
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        planTitle={plan.title}
      />
    </div>
  );
}
