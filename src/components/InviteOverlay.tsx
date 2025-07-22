
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface InviteOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  floqTitle?: string;
  inviteLink?: string;
  onGenerateLink?: () => void;
  onShareNative?: () => void;
  maxParticipants?: number;
  currentParticipants?: number;
  className?: string;
}

export const InviteOverlay: React.FC<InviteOverlayProps> = ({
  isOpen,
  onClose,
  floqTitle = "Current Floq",
  inviteLink,
  onGenerateLink,
  onShareNative,
  maxParticipants = 50,
  currentParticipants = 1,
  className = ""
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareNative = () => {
    if (navigator.share && inviteLink) {
      navigator.share({
        title: `Join ${floqTitle}`,
        text: `You're invited to join ${floqTitle} on Floq!`,
        url: inviteLink,
      }).then(() => {
        onShareNative?.();
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        {...zIndex('toast')}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 ${className}`}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite to Floq
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-center">
                <h3 className="font-medium text-foreground mb-2">
                  {floqTitle}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline">
                    {currentParticipants}/{maxParticipants} joined
                  </Badge>
                </div>
              </div>

              {inviteLink ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="px-3"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleShareNative}
                      className="flex-1 gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Invite
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate a shareable invite link to bring friends to this floq.
                  </p>
                  <Button onClick={onGenerateLink} className="w-full">
                    Generate Invite Link
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center">
                Invite links expire in 24 hours
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
