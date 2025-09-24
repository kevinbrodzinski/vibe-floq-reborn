import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Zap, Users, Heart, Share2, Sparkles } from 'lucide-react';
import { ShareCard } from '@/components/share/CardTemplates';

interface AfterglowData {
  id: string;
  date: string;
  ai_summary: string | null;
  summary_text: string | null;
  energy_score: number | null;
  social_intensity: number | null;
  dominant_vibe: string | null;
  total_venues: number | null;
  total_floqs: number | null;
  crossed_paths_count: number | null;
}

interface Props {
  afterglow: AfterglowData;
}

export default function ShareLanding({ afterglow }: Props) {
  const date = new Date(afterglow.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this Afterglow! ✨',
          text: afterglow.ai_summary || afterglow.summary_text || 'An amazing day captured',
          url: url
        });
      } catch (err) {
        // Share was cancelled
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Shared Afterglow</h1>
        </div>
        <p className="text-muted-foreground text-lg">Someone shared their day with you</p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Share Card Visual */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <ShareCard 
              data={{
                id: afterglow.id,
                date: afterglow.date,
                energy_score: afterglow.energy_score || 0,
                social_intensity: afterglow.social_intensity || 0,
                dominant_vibe: afterglow.dominant_vibe || '',
                summary_text: afterglow.summary_text,
                total_venues: afterglow.total_venues || 0,
                total_floqs: afterglow.total_floqs || 0,
                crossed_paths_count: afterglow.crossed_paths_count || 0,
                vibe_path: [],
                is_pinned: false,
                created_at: afterglow.date,
                ai_summary: afterglow.ai_summary,
                ai_summary_generated_at: undefined,
                peak_vibe_time: undefined
              }} 
              template="gradient" 
            />
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                {date}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {afterglow.ai_summary && (
                <p className="text-lg leading-relaxed">{afterglow.ai_summary}</p>
              )}
              {!afterglow.ai_summary && afterglow.summary_text && (
                <p className="text-lg leading-relaxed">{afterglow.summary_text}</p>
              )}
              {!afterglow.ai_summary && !afterglow.summary_text && (
                <p className="text-lg leading-relaxed text-muted-foreground">
                  A wonderful day captured in time ✨
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {afterglow.energy_score !== null && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{afterglow.energy_score}</div>
                  <div className="text-sm text-muted-foreground">Energy</div>
                </CardContent>
              </Card>
            )}
            
            {afterglow.social_intensity !== null && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{afterglow.social_intensity}</div>
                  <div className="text-sm text-muted-foreground">Social</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Additional Stats */}
          {(afterglow.total_venues || afterglow.total_floqs || afterglow.crossed_paths_count) && (
            <Card>
              <CardHeader>
                <CardTitle>Day Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {afterglow.total_venues && (
                  <div className="flex justify-between">
                    <span>Places visited</span>
                    <span className="font-semibold">{afterglow.total_venues}</span>
                  </div>
                )}
                {afterglow.total_floqs && (
                  <div className="flex justify-between">
                    <span>Social gatherings</span>
                    <span className="font-semibold">{afterglow.total_floqs}</span>
                  </div>
                )}
                {afterglow.crossed_paths_count && (
                  <div className="flex justify-between">
                    <span>People encountered</span>
                    <span className="font-semibold">{afterglow.crossed_paths_count}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Share Button */}
          <Button onClick={handleShare} className="w-full" size="lg">
            <Share2 className="w-4 h-4 mr-2" />
            Share This Afterglow
          </Button>

          {/* Call to Action */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <Heart className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Create Your Own Afterglow</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start capturing and sharing your daily experiences
              </p>
              <Button asChild>
                <a href="/">Get Started</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}