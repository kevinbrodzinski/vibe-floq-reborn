import { useState } from "react";
import { Share2, Copy, QrCode, Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface SharePlanButtonProps {
  planId: string;
  planTitle: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const SharePlanButton = ({
  planId,
  planTitle,
  className = "",
  variant = "outline",
  size = "default"
}: SharePlanButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const { toast } = useToast();

  const generateShareLink = () => {
    // In production, this would be the actual domain
    return `${window.location.origin}/plan/${planId}/join`;
  };

  const handleCopyLink = async () => {
    try {
      const shareLink = generateShareLink();
      await navigator.clipboard.writeText(shareLink);
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "Link copied",
        description: "Plan invite link copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        variant: "destructive",
        title: "Failed to copy link",
        description: "Please try again"
      });
    }
  };

  const handleGenerateQR = async () => {
    setIsGeneratingQR(true);
    
    try {
      // Simulate QR code generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "QR code generated",
        description: "QR code ready for sharing",
      });
      
      // In production, this would open a modal with the QR code
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        variant: "destructive",
        title: "Failed to generate QR code",
        description: "Please try again"
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      // Fallback to copy link if native sharing isn't available
      handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: `Join: ${planTitle}`,
        text: `You're invited to join this plan: ${planTitle}`,
        url: generateShareLink(),
      });
      
      toast({
        title: "Plan shared",
        description: "Invite sent successfully",
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast({
          variant: "destructive",
          title: "Failed to share",
          description: "Please try copying the link instead"
        });
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={className}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Plan
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleNativeShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Invite
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopyLink}>
          {isCopied ? (
            <Check className="w-4 h-4 mr-2 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {isCopied ? 'Copied!' : 'Copy Link'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleGenerateQR} disabled={isGeneratingQR}>
          <QrCode className="w-4 h-4 mr-2" />
          {isGeneratingQR ? 'Generating...' : 'QR Code'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => {
          const link = generateShareLink();
          window.open(`https://wa.me/?text=${encodeURIComponent(`Join my plan: ${planTitle} ${link}`)}`, '_blank');
        }}>
          <Link className="w-4 h-4 mr-2" />
          Share via WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};