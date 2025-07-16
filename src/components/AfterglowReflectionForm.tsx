import { useState } from "react";
import { Heart, Star, Camera, Users, MapPin, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AfterglowReflectionFormProps {
  planId: string;
  planTitle: string;
  onSubmit: (reflection: any) => void;
  onSkip: () => void;
  className?: string;
}

const vibeEmojis = [
  "🎉", "😊", "🔥", "✨", "💫", "🌟", "❤️", "😍", 
  "🤩", "🥳", "😎", "🌈", "🎊", "💖", "⚡", "🚀"
];

const momentTypes = [
  { id: 'highlight', label: 'Best Moment', icon: Star },
  { id: 'funny', label: 'Funniest Moment', icon: '😂' },
  { id: 'surprise', label: 'Biggest Surprise', icon: '🎯' },
  { id: 'connection', label: 'Connection Made', icon: Users },
  { id: 'discovery', label: 'New Discovery', icon: '🔍' },
  { id: 'photo', label: 'Photo Worthy', icon: Camera }
];

export const AfterglowReflectionForm = ({
  planId,
  planTitle,
  onSubmit,
  onSkip,
  className = ""
}: AfterglowReflectionFormProps) => {
  const [reflection, setReflection] = useState({
    overall_rating: [8],
    energy_level: [7],
    social_connection: [8],
    would_repeat: [9],
    overall_vibe: "",
    best_moment: "",
    worst_moment: "",
    new_discovery: "",
    memorable_quote: "",
    photo_worthy_moments: "",
    group_chemistry: [8],
    plan_execution: [7],
    venue_ratings: "",
    spontaneous_moments: "",
    weather_impact: "",
    budget_satisfaction: [7],
    time_satisfaction: [8],
    final_thoughts: ""
  });

  const [selectedVibeEmoji, setSelectedVibeEmoji] = useState("");
  const [selectedMoments, setSelectedMoments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSliderChange = (field: string, value: number[]) => {
    setReflection(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field: string, value: string) => {
    setReflection(prev => ({ ...prev, [field]: value }));
  };

  const toggleMomentType = (momentId: string) => {
    setSelectedMoments(prev => 
      prev.includes(momentId) 
        ? prev.filter(id => id !== momentId)
        : [...prev, momentId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const afterglowData = {
        plan_id: planId,
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        overall_rating: reflection.overall_rating[0],
        energy_level: reflection.energy_level[0],
        social_connection: reflection.social_connection[0],
        would_repeat_score: reflection.would_repeat[0],
        overall_vibe: selectedVibeEmoji,
        moments: {
          best: reflection.best_moment,
          worst: reflection.worst_moment,
          discovery: reflection.new_discovery,
          quote: reflection.memorable_quote,
          photo_worthy: reflection.photo_worthy_moments,
          spontaneous: reflection.spontaneous_moments,
          moment_types: selectedMoments
        },
        ratings: {
          group_chemistry: reflection.group_chemistry[0],
          plan_execution: reflection.plan_execution[0],
          budget_satisfaction: reflection.budget_satisfaction[0],
          time_satisfaction: reflection.time_satisfaction[0]
        },
        final_thoughts: reflection.final_thoughts,
        weather_impact: reflection.weather_impact,
        venue_feedback: reflection.venue_ratings
      };

      const { error } = await supabase
        .from('plan_afterglow')
        .insert(afterglowData);

      if (error) throw error;

      toast({
        title: "Afterglow saved! ✨",
        description: "Your memories have been captured",
      });

      onSubmit(afterglowData);
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        variant: "destructive",
        title: "Failed to save reflection",
        description: "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`max-w-2xl mx-auto p-6 space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Heart className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-semibold">Afterglow Reflection</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Capture the magic of "{planTitle}"
        </p>
      </div>

      <div className="space-y-6">
        {/* Overall Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Overall Experience (1-10)</Label>
            <Slider
              value={reflection.overall_rating}
              onValueChange={(value) => handleSliderChange('overall_rating', value)}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="text-center text-sm font-medium">
              {reflection.overall_rating[0]}/10
            </div>
          </div>

          <div className="space-y-2">
            <Label>Energy Level (1-10)</Label>
            <Slider
              value={reflection.energy_level}
              onValueChange={(value) => handleSliderChange('energy_level', value)}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="text-center text-sm font-medium">
              {reflection.energy_level[0]}/10
            </div>
          </div>
        </div>

        {/* Vibe Selection */}
        <div className="space-y-3">
          <Label>What was the overall vibe?</Label>
          <div className="flex flex-wrap gap-2">
            {vibeEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant={selectedVibeEmoji === emoji ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedVibeEmoji(emoji)}
                className="text-lg"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        {/* Moment Types */}
        <div className="space-y-3">
          <Label>What types of moments happened?</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {momentTypes.map((moment) => (
              <Button
                key={moment.id}
                variant={selectedMoments.includes(moment.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMomentType(moment.id)}
                className="justify-start"
              >
                {typeof moment.icon === 'string' ? (
                  <span className="mr-2">{moment.icon}</span>
                ) : (
                  <moment.icon className="w-4 h-4 mr-2" />
                )}
                {moment.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Text Reflections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Best moment of the night</Label>
            <Textarea
              placeholder="What made you smile the most?"
              value={reflection.best_moment}
              onChange={(e) => handleTextChange('best_moment', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Something new you discovered</Label>
            <Textarea
              placeholder="A place, person, or experience..."
              value={reflection.new_discovery}
              onChange={(e) => handleTextChange('new_discovery', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Quote of the night</Label>
          <Input
            placeholder="Someone said something memorable..."
            value={reflection.memorable_quote}
            onChange={(e) => handleTextChange('memorable_quote', e.target.value)}
          />
        </div>

        {/* Group Dynamics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Group Chemistry (1-10)</Label>
            <Slider
              value={reflection.group_chemistry}
              onValueChange={(value) => handleSliderChange('group_chemistry', value)}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="text-center text-sm font-medium">
              {reflection.group_chemistry[0]}/10
            </div>
          </div>

          <div className="space-y-2">
            <Label>Would You Repeat? (1-10)</Label>
            <Slider
              value={reflection.would_repeat}
              onValueChange={(value) => handleSliderChange('would_repeat', value)}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="text-center text-sm font-medium">
              {reflection.would_repeat[0]}/10
            </div>
          </div>
        </div>

        {/* Final Thoughts */}
        <div className="space-y-2">
          <Label>Final thoughts & reflections</Label>
          <Textarea
            placeholder="How are you feeling? What are you grateful for? Any insights?"
            value={reflection.final_thoughts}
            onChange={(e) => handleTextChange('final_thoughts', e.target.value)}
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onSkip} variant="outline" className="flex-1">
            Skip for now
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Save Afterglow
          </Button>
        </div>
      </div>
    </Card>
  );
};