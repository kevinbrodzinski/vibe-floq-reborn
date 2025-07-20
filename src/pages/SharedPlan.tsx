
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useResolvePlanSlug } from '@/hooks/useResolvePlanSlug';
import { useTrackPlanShareClick } from '@/hooks/useTrackPlanShareClick';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useGuestSession } from '@/hooks/useGuestSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share2, Users, Calendar, MapPin, UserPlus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function SharedPlan() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { guestName, saveGuestName } = useGuestSession();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestInputName, setGuestInputName] = useState('');

  // Track click and resolve slug to plan ID
  useTrackPlanShareClick(slug);
  const { data: planResolution, isLoading: isResolving, error: resolveError } = useResolvePlanSlug(slug!);

  // If this is a direct plan ID (not a shared slug), redirect to the regular plan view
  useEffect(() => {
    if (planResolution?.type === 'plan_id') {
      navigate(`/plan/${planResolution.plan_id}`, { replace: true });
      return;
    }
  }, [planResolution, navigate]);

  useEffect(() => {
    fetchPlan();
  }, [planResolution?.plan_id]);

  const handleJoinPlan = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!planResolution?.plan_id) return;

    setIsJoining(true);
    try {
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('plan_participants')
        .select('id')
        .eq('plan_id', planResolution.plan_id)
        .eq('user_id', user.id)
        .single();

      if (!existingParticipant) {
        // Add user as participant
        const { error } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: planResolution.plan_id,
            user_id: user.id,
            role: 'participant'
          });

        if (error) throw error;
      }

      // Navigate to the collaborative planning screen
      navigate(`/plan/${planResolution.plan_id}`);
    } catch (error) {
      console.error('Error joining plan:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinAsGuest = async () => {
    if (!guestInputName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join as a guest.",
        variant: "destructive"
      });
      return;
    }

    if (!planResolution?.plan_id) return;

    setIsJoining(true);
    try {
      const response = await supabase.functions.invoke('join-as-guest', {
        body: {
          plan_id: planResolution.plan_id,
          guest_name: guestInputName.trim()
        }
      });

      if (response.error) throw response.error;

      // Save guest name locally
      saveGuestName(guestInputName.trim());
      setShowGuestModal(false);
      
      toast({
        title: "Joined Successfully!",
        description: `Welcome ${guestInputName}! You've joined the plan as a guest.`,
      });

      // Refresh plan data to show guest in participants
      await fetchPlan();
    } catch (error) {
      console.error('Error joining as guest:', error);
      toast({
        title: "Failed to Join",
        description: "There was an error joining the plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const fetchPlan = async () => {
    if (!planResolution?.plan_id || planResolution.type !== 'slug') return;

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
            is_guest,
            guest_name,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('id', planResolution.plan_id)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
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
  const isGuestParticipant = !user && guestName && plan.plan_participants?.some((p: any) => p.is_guest && p.guest_name === guestName);
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
                      {participant.is_guest ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <UserPlus className="w-3 h-3 text-white" />
                        </div>
                      ) : participant.profiles?.avatar_url ? (
                        <img
                          src={participant.profiles.avatar_url}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {participant.profiles?.display_name?.[0] || 
                             participant.profiles?.username?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {participant.is_guest 
                          ? `${participant.guest_name} (Guest)`
                          : participant.profiles?.display_name || 
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
              {isParticipant || isGuestParticipant ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">
                    ✓ You're part of this plan{isGuestParticipant ? ' as a guest' : ''}
                  </p>
                  <Button 
                    onClick={() => navigate(`/plan/${planResolution?.plan_id}`)}
                    className="w-full"
                  >
                    View Full Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {user ? (
                    <Button
                      onClick={handleJoinPlan}
                      disabled={isJoining}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    >
                      {isJoining ? 'Joining...' : 'Join Plan'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleJoinPlan}
                        disabled={isJoining}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                      >
                        Sign In & Join Plan
                      </Button>
                      <div className="text-center">
                        <span className="text-sm text-gray-500">or</span>
                      </div>
                      <Button
                        onClick={() => setShowGuestModal(true)}
                        variant="outline"
                        className="w-full"
                        disabled={isJoining}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Join as Guest
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guest Join Modal */}
        <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Join as Guest</DialogTitle>
              <DialogDescription>
                Enter your name to join this plan without creating an account. You can upgrade to a full account later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Your name"
                value={guestInputName}
                onChange={(e) => setGuestInputName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinAsGuest()}
                maxLength={50}
              />
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowGuestModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoinAsGuest}
                  disabled={isJoining || !guestInputName.trim()}
                  className="flex-1"
                >
                  {isJoining ? 'Joining...' : 'Join Plan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
