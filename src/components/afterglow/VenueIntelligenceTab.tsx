import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Users, TrendingUp, Heart, MapPin, Star, Clock } from 'lucide-react';
import { useAfterglowVenueIntelligence } from '@/hooks/useAfterglowVenueIntelligence';
import { generateMomentInsights } from '@/utils/afterglowMetadataProcessor';
import { supabase } from '@/integrations/supabase/client';

interface VenueIntelligenceTabProps {
  afterglowId: string;
}

export default function VenueIntelligenceTab({ afterglowId }: VenueIntelligenceTabProps) {
  const [moments, setMoments] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { 
    enhanceAfterglowMoment, 
    getVenueRecommendationsFromHistory,
    isLoading: isEnhancing 
  } = useAfterglowVenueIntelligence();

  useEffect(() => {
    const fetchMomentsAndInsights = async () => {
      try {
        setIsLoading(true);
        
        // Fetch moments for this afterglow
        const { data: momentsData, error: momentsError } = await supabase
          .from('afterglow_moments')
          .select('*')
          .eq('daily_afterglow_id', afterglowId)
          .order('timestamp', { ascending: true });

        if (momentsError) throw momentsError;

        if (momentsData?.length) {
          setMoments(momentsData);
          
          // Generate insights from moments
          const processedMoments = momentsData.map(moment => ({
            metadata: moment.metadata || {}
          }));
          
          const generatedInsights = generateMomentInsights(processedMoments);
          setInsights(generatedInsights);
        }
      } catch (error) {
        console.error('Error fetching moments and insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (afterglowId) {
      fetchMomentsAndInsights();
    }
  }, [afterglowId]);

  const handleEnhanceMoment = async (momentId: string) => {
    try {
      await enhanceAfterglowMoment(momentId);
      // Refresh insights after enhancement
      window.location.reload();
    } catch (error) {
      console.error('Error enhancing moment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!moments.length) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Moments Available</h3>
        <p className="text-muted-foreground">
          This afterglow doesn't have any moments to analyze yet.
        </p>
      </div>
    );
  }

  const hasVenueIntelligence = insights?.has_venue_intelligence;
  const intelligenceCoverage = insights?.intelligence_coverage || 0;
  const venueInsights = insights?.venue_intelligence_insights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Venue Intelligence</h3>
        <p className="text-sm text-muted-foreground">
          AI-powered insights about your venue experiences and social connections
        </p>
      </div>

      {/* Intelligence Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Intelligence Coverage
          </CardTitle>
          <CardDescription>
            How much of your afterglow has been enhanced with venue intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Enhanced Moments</span>
                <span>{Math.round(intelligenceCoverage * 100)}%</span>
              </div>
              <Progress value={intelligenceCoverage * 100} className="h-2" />
            </div>
            
            {intelligenceCoverage < 1 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm">Enhance remaining moments</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => moments.length > 0 && handleEnhanceMoment(moments[0].id)}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? 'Enhancing...' : 'Enhance'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Venue Intelligence Insights */}
      {hasVenueIntelligence && venueInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vibe Match Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Vibe Match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-500 mb-2">
                  {Math.round(venueInsights.avg_vibe_match_score * 100)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Average vibe alignment score
                </p>
                <Badge 
                  variant={venueInsights.intelligence_trend === 'improving' ? 'default' : 'secondary'}
                  className="mt-2"
                >
                  {venueInsights.intelligence_trend}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Social Proof */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Social Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  {venueInsights.social_proof_strength}
                </div>
                <p className="text-sm text-muted-foreground">
                  Friend visits across venues
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Crowd Intelligence */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Crowd Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">
                  {venueInsights.crowd_intelligence_summary}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your preferred venue energy level
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Venue Recommendations */}
      {hasVenueIntelligence && venueInsights?.venue_recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-500" />
              Personalized Recommendations
            </CardTitle>
            <CardDescription>
              Based on your venue intelligence patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {venueInsights.venue_recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Scores */}
      {hasVenueIntelligence && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {insights.social_score}
                </div>
                <p className="text-sm text-muted-foreground">Enhanced Social Score</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary mb-1">
                  {insights.exploration_score}
                </div>
                <p className="text-sm text-muted-foreground">Enhanced Exploration Score</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Intelligence Available */}
      {!hasVenueIntelligence && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Venue Intelligence Yet</h3>
              <p className="text-muted-foreground mb-4">
                Enhance your moments with AI-powered venue intelligence to see personalized insights.
              </p>
              <Button
                onClick={() => moments.length > 0 && handleEnhanceMoment(moments[0].id)}
                disabled={isEnhancing}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <Brain className="w-4 h-4 mr-2" />
                {isEnhancing ? 'Enhancing...' : 'Start Enhancement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}