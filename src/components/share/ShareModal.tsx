'use client';
import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareCard } from './CardTemplates';
import { AfterglowDetail } from '@/lib/afterglow-helpers';
import { captureNodeToPng, shareOrDownload } from '@/lib/share/generateShareImage';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  afterglow: AfterglowDetail['afterglow'];
}

export default function ShareModal({ open, onOpenChange, afterglow }: Props) {
  const [template, setTemplate] = useState<'minimal' | 'gradient'>('gradient');
  const previewRef = useRef<HTMLDivElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleShare = async () => {
    if (!previewRef.current) return;
    setProcessing(true);
    try {
      const blob = await captureNodeToPng(previewRef.current);
      await shareOrDownload(blob, `afterglow-${afterglow.date}.png`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>Share your Afterglow</DialogHeader>

        {/* template selector */}
        <div className="flex gap-4 mb-4">
          {(['gradient', 'minimal'] as const).map((tpl) => (
            <Button
              key={tpl}
              size="sm"
              variant={tpl === template ? 'default' : 'outline'}
              onClick={() => setTemplate(tpl)}
            >
              {tpl}
            </Button>
          ))}
        </div>

        {/* live preview (hidden off-screen for capture) */}
        <div className="w-full h-80 overflow-hidden rounded-lg shadow relative">
          <div
            ref={previewRef}
            className="scale-[0.21] origin-top-left absolute -top-10 -left-10"
          >
            <ShareCard data={afterglow} template={template} />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleShare} disabled={processing}>
            {processing ? 'Rendering…' : 'Share / Download'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}