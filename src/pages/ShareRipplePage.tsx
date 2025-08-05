import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RipplePayload {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  created_at: string;
  profile_id: string;
}

interface ShareRippleProps {
  ripple?: RipplePayload;
  loading: boolean;
}

function ShareRipple({ ripple, loading }: ShareRippleProps) {
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading ripple...</p>
        </div>
      </div>
    );
  }

  if (!ripple) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Ripple not found</h1>
          <p className="text-muted-foreground">This ripple might have been removed or doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border p-8 space-y-6">
            {ripple.image_url && (
              <img 
                src={ripple.image_url} 
                alt={ripple.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">{ripple.title}</h1>
              {ripple.description && (
                <p className="text-muted-foreground text-lg">{ripple.description}</p>
              )}
              <div className="text-sm text-muted-foreground">
                Shared on {new Date(ripple.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShareRipplePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<RipplePayload>({
    queryKey: ['ripple', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('afterglow_share_links')
        .select('*, daily_afterglow(*)')
        .eq('slug', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Ripple not found');
      
      return {
        id: data.id,
        title: data.daily_afterglow?.summary_text || 'Shared Afterglow',
        description: data.daily_afterglow?.ai_summary,
        image_url: data.og_image_url,
        created_at: data.created_at,
        profile_id: (data.daily_afterglow as any)?.profile_id || '',
      } as RipplePayload;
    },
    staleTime: 5 * 60_000,
  });

  return <ShareRipple ripple={data} loading={isLoading} />;
}