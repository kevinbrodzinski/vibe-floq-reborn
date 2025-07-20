
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useResolvePlanSlug } from '@/hooks/useResolvePlanSlug';
import { useTrackPlanShareClick } from '@/hooks/useTrackPlanShareClick';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner';
import { Share2, Users, Calendar, MapPin } from 'lucide-react';

export default function SharedPlan() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // Track click and resolve slug to plan ID
  useTrackPlanShareClick(slug);
  const { data: planId, isLoading: isResolving, error: resolveError } = useResolvePlanSlug(slug!);

  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('floq_plans')
          .select(`
            *,
            floqs:floq_id (
              id,
              name,
              description
            ),
            plan_participants (
              id,
              user_id,
              role,
              profiles:user_id (
                id,
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
      navigate('/auth');
      return;
    }

    if (!planId) return;

    setIsJoining(true);
    try {
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('plan_participants')
        .select('id')
        .eq('plan_id', planId)
        .eq('user_id', user.id)
        .single();

      if (!existingParticipant) {
        // Add user as participant
        const { error } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: planId,
            user_id: user.id,
            role: 'participant'
          });

        if (error) throw error;
      }

      // Navigate to the collaborative planning screen
      navigate(`/plan/${planId}`);
    } catch (error) {
      console.error('Error joining plan:', error);
    } finally {
      setIsJoining(false);
    }
  };

  if (isResolving || loading) {
    return <FullScreenSpinner />;
  }

  if (resolveError || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Plan Not Found</CardTitle>
            <CardDescription>
              This plan link may be invalid or expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isParticipant = user && plan.plan_participants?.some((p: any) => p.user_id === user.id);
  const participantCount = plan.plan_participants?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">You're Invited!</h1>
          <p className="text-gray-600">Join this collaborative plan</p>
        </div>

        {/* Plan Card */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{plan.title}</CardTitle>
                <CardDescription className="text-blue-100 mt-2">
                  {plan.description}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                <Share2 className="w-4 h-4 mr-1" />
                Shared Plan
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-sm">
                  {participantCount} participant{participantCount !== 1 ? 's' : ''}
                </span>
              </div>
              
              {plan.scheduled_for && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <span className="text-sm">
                    {new Date(plan.scheduled_for).toLocaleDateString()}
                  </span>
                </div>
              )}

              {plan.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <span className="text-sm truncate">{plan.location}</span>
                </div>
              )}
            </div>

            {/* Floq Info */}
            {plan.floqs && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Part of Floq</h3>
                <p className="text-gray-700 font-medium">{plan.floqs.name}</p>
                {plan.floqs.description && (
                  <p className="text-gray-600 text-sm mt-1">{plan.floqs.description}</p>
                )}
              </div>
            )}

            {/* Participants Preview */}
            {plan.plan_participants && plan.plan_participants.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Participants</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.plan_participants.slice(0, 5).map((participant: any) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1"
                    >
                      {participant.profiles?.avatar_url ? (
                        <img
                          src={participant.profiles.avatar_url}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {participant.profiles?.display_name?.[0] || 
                             participant.profiles?.username?.[0] || '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {participant.profiles?.display_name || 
                         participant.profiles?.username || 'Anonymous'}
                      </span>
                    </div>
                  ))}
                  {plan.plan_participants.length > 5 && (
                    <div className="bg-gray-200 rounded-full px-3 py-1">
                      <span className="text-sm text-gray-600">
                        +{plan.plan_participants.length - 5} more
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              {isParticipant ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">✓ You're part of this plan</p>
                  <Button 
                    onClick={() => navigate(`/plan/${planId}`)}
                    className="w-full"
                  >
                    View Full Plan
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleJoinPlan}
                  disabled={isJoining}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  {isJoining ? 'Joining...' : 'Join Plan'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
