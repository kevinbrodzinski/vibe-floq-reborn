import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCreateFloq } from '@/hooks/useCreateFloq';
import { Sparkles, ArrowLeft, Users, Lock, Globe } from 'lucide-react';
import { Glass } from '@/components/Common/Glass';
import { NeonPill } from '@/components/Common/NeonPill';

const vibeOptions = [
  { id: 'social', label: 'Social', description: 'Meeting new people and networking' },
  { id: 'chill', label: 'Chill', description: 'Relaxed hangouts and low-key activities' },
  { id: 'active', label: 'Active', description: 'Sports, workouts, and energetic activities' },
  { id: 'hype', label: 'Hype', description: 'Parties, events, and high-energy fun' },
  { id: 'productive', label: 'Productive', description: 'Work, study groups, and goal-oriented' },
  { id: 'quiet', label: 'Quiet', description: 'Peaceful activities and mindful experiences' },
];

export default function FloqCreatePage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primary_vibe: 'social',
    privacy: 'open' as 'open' | 'invite'
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { mutate: createFloq, isPending } = useCreateFloq();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Floq name is required',
      });
      return;
    }

    createFloq(formData, {
      onSuccess: (data) => {
        toast({
          title: 'Floq Created!',
          description: `Welcome to ${formData.name}. Start inviting friends!`,
        });
        // Navigate to the new floq's HQ
        if (data?.id) {
          navigate(`/floqs/${data.id}/hq`);
        } else {
          navigate('/floqs');
        }
      },
      onError: (error: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to create floq',
          description: error.message || 'Something went wrong. Please try again.',
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/floqs')}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-4 text-[12px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Floqs
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg grid place-items-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Create a New Floq</h1>
            <p className="text-[12px] text-white/60">
              Start your own circle and connect with like-minded people
            </p>
          </div>
        </div>

        {/* Form */}
        <Glass className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Floq Name *</Label>
                <Input
                  id="name"
                  placeholder="What should we call your floq?"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's your floq about? What brings you together?"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* Primary Vibe */}
            <div className="space-y-3">
              <Label>Primary Vibe</Label>
              <div className="grid grid-cols-2 gap-3">
                {vibeOptions.map((vibe) => (
                  <button
                    key={vibe.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, primary_vibe: vibe.id }))}
                    className={`p-3 rounded-xl border text-left transition ${
                      formData.primary_vibe === vibe.id
                        ? "bg-white/15 border-white/20"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-medium text-[13px] capitalize">{vibe.label}</div>
                    <div className="text-[11px] text-white/60 mt-1">{vibe.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3">
              <Label>Privacy</Label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, privacy: 'open' }))}
                  className={`w-full p-3 rounded-xl border text-left transition ${
                    formData.privacy === 'open'
                      ? "bg-white/15 border-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Open</span>
                  </div>
                  <div className="text-[11px] text-white/60 mt-1">
                    Anyone can discover and join this floq
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, privacy: 'invite' }))}
                  className={`w-full p-3 rounded-xl border text-left transition ${
                    formData.privacy === 'invite'
                      ? "bg-white/15 border-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Invite Only</span>
                  </div>
                  <div className="text-[11px] text-white/60 mt-1">
                    Only people you invite can join this floq
                  </div>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full neon-pill neon-ring py-3"
                disabled={isPending || !formData.name.trim()}
              >
                {isPending ? (
                  'Creating Floq...'
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Create Floq
                  </>
                )}
              </Button>
              
              <p className="text-[11px] text-white/60 text-center mt-3">
                You'll be able to invite friends and customize settings after creation
              </p>
            </div>
          </form>
        </Glass>
      </div>
    </div>
  );
}