import { useState } from "react";
import { Share2, Download, Copy, Heart, Calendar, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AfterglowShareData {
  id: string;
  plan_title: string;
  date: string;
  overall_rating: number;
  energy_level: number;
  overall_vibe: string;
  moments: {
    best?: string;
    quote?: string;
    discovery?: string;
    moment_types?: string[];
  };
  participants: Array<{
    id: string;
    display_name: string;
    avatar_url?: string;
  }>;
  group_chemistry: number;
}

interface AfterglowShareViewProps {
  afterglow: AfterglowShareData;
  isPublic?: boolean;
  className?: string;
}

export const AfterglowShareView = ({
  afterglow,
  isPublic = false,
  className = ""
}: AfterglowShareViewProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const generateShareText = () => {
    const rating = afterglow.overall_rating;
    const vibe = afterglow.overall_vibe;
    
    return `Just had an amazing night out! ${vibe}\n\n"${afterglow.plan_title}" - ${rating}/10 ⭐\n\nWith ${afterglow.participants.length} amazing people. ${afterglow.moments.best ? `Best moment: ${afterglow.moments.best}` : ''}\n\n#VibeFlow #Afterglow`;
  };

  const handleShare = async (method: 'native' | 'copy' | 'download') => {
    setIsSharing(true);
    
    try {
      const shareText = generateShareText();
      const shareUrl = `${window.location.origin}/afterglow/${afterglow.id}`;
      
      switch (method) {
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: `${afterglow.plan_title} - Afterglow`,
              text: shareText,
              url: shareUrl,
            });
          } else {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            toast({
              title: "Copied to clipboard",
              description: "Share text has been copied",
            });
          }
          break;
          
        case 'copy':
          await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
          toast({
            title: "Copied to clipboard",
            description: "Share link has been copied",
          });
          break;
          
        case 'download':
          // Generate a shareable image/PDF (would need additional implementation)
          toast({
            title: "Download started",
            description: "Your afterglow summary is being prepared",
          });
          break;
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        variant: "destructive",
        title: "Failed to share",
        description: "Please try again"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.min(5, Math.round(rating / 2)));
  };

  return (
    <div className={`max-w-md mx-auto bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 text-white rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="relative p-6 pb-4">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
        </div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-300" />
              <span className="text-sm font-medium text-pink-100">Afterglow</span>
            </div>
            <div className="text-2xl">{afterglow.overall_vibe || "✨"}</div>
          </div>
          
          <h1 className="text-xl font-bold mb-2">{afterglow.plan_title}</h1>
          
          <div className="flex items-center gap-3 text-sm text-purple-200">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(afterglow.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{afterglow.participants.length} people</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-300">
              {afterglow.overall_rating}/10
            </div>
            <div className="text-xs text-purple-200">Overall</div>
            <div className="text-sm">{getRatingStars(afterglow.overall_rating)}</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-orange-300">
              {afterglow.energy_level}/10
            </div>
            <div className="text-xs text-purple-200">Energy</div>
            <div className="text-sm">⚡</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-pink-300">
              {afterglow.group_chemistry}/10
            </div>
            <div className="text-xs text-purple-200">Chemistry</div>
            <div className="text-sm">🔥</div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="px-6 pb-4 space-y-3">
        {afterglow.moments?.best && (
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3 h-3 text-yellow-300" />
              <span className="text-xs font-medium text-yellow-100">Best Moment</span>
            </div>
            <p className="text-sm text-white/90">"{afterglow.moments.best}"</p>
          </div>
        )}

        {afterglow.moments?.quote && (
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-blue-100">💬 Quote of the Night</span>
            </div>
            <p className="text-sm italic text-white/90">"{afterglow.moments.quote}"</p>
          </div>
        )}

        {afterglow.moments?.moment_types && afterglow.moments.moment_types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {afterglow.moments.moment_types.slice(0, 4).map((moment, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-white/20 text-white border-0"
              >
                {moment.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* The Crew */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-medium text-purple-200 mb-2">The Crew</h3>
        <div className="flex flex-wrap gap-1">
          {afterglow.participants.slice(0, 6).map((participant, index) => (
            <span 
              key={participant.id}
              className="text-xs bg-white/20 rounded-full px-2 py-1 text-white"
            >
              {participant.display_name}
            </span>
          ))}
          {afterglow.participants.length > 6 && (
            <span className="text-xs bg-white/20 rounded-full px-2 py-1 text-purple-200">
              +{afterglow.participants.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Share Actions */}
      {!isPublic && (
        <div className="p-4 bg-black/20 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare('native')}
              disabled={isSharing}
              className="text-white hover:bg-white/10 flex-col gap-1 h-auto py-2"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs">Share</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare('copy')}
              disabled={isSharing}
              className="text-white hover:bg-white/10 flex-col gap-1 h-auto py-2"
            >
              <Copy className="w-4 h-4" />
              <span className="text-xs">Copy</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare('download')}
              disabled={isSharing}
              className="text-white hover:bg-white/10 flex-col gap-1 h-auto py-2"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">Save</span>
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <p className="text-xs text-purple-300">
          Powered by VibeFlow ✨
        </p>
      </div>
    </div>
  );
};