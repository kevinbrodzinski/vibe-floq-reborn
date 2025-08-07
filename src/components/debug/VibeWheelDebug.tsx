import React from 'react';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER } from '@/lib/vibes';

export const VibeWheelDebug: React.FC = () => {
  const { vibe: currentVibe, isUpdating } = useVibe();
  
  const currentIndex = VIBE_ORDER.indexOf(currentVibe);
  const expectedAngle = currentIndex * (360 / VIBE_ORDER.length);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="space-y-1">
        <div><strong>Current Vibe:</strong> {currentVibe}</div>
        <div><strong>Index:</strong> {currentIndex}</div>
        <div><strong>Expected Angle:</strong> {expectedAngle}°</div>
        <div><strong>Updating:</strong> {isUpdating ? '✅' : '❌'}</div>
        <div><strong>Total Vibes:</strong> {VIBE_ORDER.length}</div>
        <div><strong>Vibe Order:</strong></div>
        <div className="max-w-48 text-xs">
          {VIBE_ORDER.map((vibe, i) => (
            <span key={vibe} className={vibe === currentVibe ? 'bg-blue-600 px-1 rounded' : ''}>
              {i}: {vibe}{i < VIBE_ORDER.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};