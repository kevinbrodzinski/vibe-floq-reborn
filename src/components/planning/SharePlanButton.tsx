import { usePlanShareLink } from '@/hooks/usePlanShareLink';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SharePlanButtonProps {
  planId: string;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'lg' | 'default' | 'icon';
}

export function SharePlanButton({ planId, variant = 'outline', size = 'default' }: SharePlanButtonProps) {
  const { mutateAsync: createShareLink, isPending: isLoading } = usePlanShareLink(planId);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const shareLink = await createShareLink();
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      toast.success('Plan link copied to clipboard!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      const shareLink = await createShareLink();
      
      // Try native sharing first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join my plan!',
            text: 'Check out this plan I created',
            url: shareLink.url,
          });
          return;
        } catch (error) {
          // Fall back to copying if sharing was cancelled
          console.log('Share cancelled or failed, falling back to copy');
        }
      }
      
      // Fall back to copying
      handleCopy();
    } catch (error) {
      console.error('Failed to create share link:', error);
      toast.error('Failed to create share link');
    }
  };

  if (!planId) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Generating...
        </>
      ) : copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          {navigator.share ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {navigator.share ? 'Share Plan' : 'Copy Link'}
        </>
      )}
    </Button>
  );
}