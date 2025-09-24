
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { zIndex } from '@/constants/z';

/**
 * LayerShowcase - Visual test component for z-index hierarchy
 * Shows all major layers to verify stacking order manually
 */
export function LayerShowcase() {
  const [showOverlay, setShowOverlay] = useState(false);
  const { toast } = useToast();

  const triggerToast = () => {
    toast({
      title: "Z-Index Test Toast",
      description: "This should appear above all other layers (z-90)",
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Z-Index Layer Showcase</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Navigation Layer */}
        <div 
          className="bg-blue-100 p-4 border rounded"
          {...zIndex('navigation')}
          data-testid="navigation-layer"
        >
          <h3 className="font-semibold">Navigation (z-60)</h3>
          <p className="text-sm">Header/nav elements</p>
        </div>

        {/* System Layer */}
        <div 
          className="bg-green-100 p-4 border rounded"
          {...zIndex('system')}
          data-testid="system-layer"
        >
          <h3 className="font-semibold">System (z-50)</h3>
          <p className="text-sm">Floating FABs, controls</p>
        </div>

        {/* Overlay Layer */}
        <div 
          className="bg-yellow-100 p-4 border rounded"
          {...zIndex('overlay')}
          data-testid="overlay-layer"
        >
          <h3 className="font-semibold">Overlay (z-30)</h3>
          <p className="text-sm">Banners, field overlays</p>
        </div>

        {/* UI Layer */}
        <div 
          className="bg-purple-100 p-4 border rounded"
          {...zIndex('ui')}
          data-testid="ui-layer"
        >
          <h3 className="font-semibold">UI (z-20)</h3>
          <p className="text-sm">Regular page content</p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Modal Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open Modal (z-70)</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modal Layer Test</DialogTitle>
            </DialogHeader>
            <p>This modal should appear above navigation and system layers.</p>
            <Button onClick={triggerToast}>
              Trigger Toast (should appear above this modal)
            </Button>
          </DialogContent>
        </Dialog>

        {/* Toast Trigger */}
        <Button onClick={triggerToast}>
          Trigger Toast (z-90)
        </Button>

        {/* Overlay Toggle */}
        <Button 
          variant="secondary"
          onClick={() => setShowOverlay(!showOverlay)}
        >
          Toggle Test Overlay
        </Button>
      </div>

      {/* Test Overlay */}
      {showOverlay && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center"
          {...zIndex('modal')}
          onClick={() => setShowOverlay(false)}
        >
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="font-semibold mb-2">Test Overlay (z-70)</h3>
            <p className="mb-4">Should appear above navigation but below toasts</p>
            <Button onClick={triggerToast}>
              Test Toast Above Modal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
