import { Fragment, useEffect } from 'react';
import { LiveFeedFull } from '@/components/pulse/LiveFeedFull';

export const LiveActivitySheet = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  // Handle escape key
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 flex justify-center">
        <div className="w-full max-w-md rounded-t-2xl bg-gray-900 shadow-xl transform transition-transform duration-200">
          {/* Grabber bar for iOS-style bottom sheet */}
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-600" />
          
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-white">All activity</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Scrollable body */}
          <div className="h-[70vh] overflow-y-auto">
            <LiveFeedFull />
          </div>
        </div>
      </div>
    </div>
  );
}; 