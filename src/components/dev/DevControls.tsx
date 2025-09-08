/**
 * Development Controls for Social Weather System
 * Keyboard shortcuts and debug toggles
 */

import { useEffect } from 'react';

export function DevControls() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'p':
          // Toggle precipitation intensity
          console.log('[DevControls] Toggling precipitation density');
          if ((window as any).__precipOverlay) {
            const overlay = (window as any).__precipOverlay;
            const currentTier = overlay._tier || 'high';
            const nextTier = currentTier === 'high' ? 'low' : 'high';
            overlay.setQuality({ tier: nextTier });
            console.log(`[DevControls] Precipitation tier: ${currentTier} → ${nextTier}`);
          }
          break;
          
        case 'l':
          // Toggle lightning frequency
          console.log('[DevControls] Toggling lightning frequency');
          if ((window as any).__lightningOverlay) {
            const overlay = (window as any).__lightningOverlay;
            const currentTier = overlay._tier || 'high';
            const nextTier = currentTier === 'high' ? 'low' : 'high';
            overlay.setQuality({ tier: nextTier });
            console.log(`[DevControls] Lightning tier: ${currentTier} → ${nextTier}`);
          }
          break;
          
        case 'c':
          // Toggle cascade ripples
          console.log('[DevControls] Toggling cascade ripples');
          if ((window as any).__cascadeOverlay) {
            const overlay = (window as any).__cascadeOverlay;
            const currentTier = overlay.tier || 'high';
            const nextTier = currentTier === 'high' ? 'low' : 'high';
            overlay.setQuality({ tier: nextTier });
            console.log(`[DevControls] Cascade tier: ${currentTier} → ${nextTier}`);
          }
          break;
          
        case 'r':
          // Toggle time-lapse replay mode (UI controlled)
          console.log('[DevControls] Toggling replay mode');
          if ((window as any).__replayMode !== undefined) {
            const isReplay = (window as any).__replayMode;
            if (isReplay && (window as any).__backToLive) {
              (window as any).__backToLive();
            } else if (!isReplay && (window as any).__enterReplay) {
              (window as any).__enterReplay();
            }
          }
          break;
          
        case 't':
          // Manual time-lapse control (direct controller access)
          console.log('[DevControls] Manual time-lapse toggle');
          if ((window as any).__timeLapseController) {
            const controller = (window as any).__timeLapseController;
            if (controller.isPlaying()) {
              controller.stopPlayback();
              console.log('[DevControls] Time-lapse playback stopped');
            } else {
              controller.startPlayback();
              console.log('[DevControls] Time-lapse playback started');
            }
          }
          break;

        case 'w':
          // Force weather update
          console.log('[DevControls] Forcing weather status update');
          if ((window as any).__socialWeatherTracker) {
            const tracker = (window as any).__socialWeatherTracker;
            // Force an update with random metrics
            const metrics = {
              meanPressure: Math.random() * 0.6 + 0.2,
              stdPressure: Math.random() * 0.3 + 0.1,
              meanGradient: Math.random() * 0.8 + 0.1,
              windsStrength: Math.random() * 0.7 + 0.2,
              laneDensity: Math.random() * 0.5 + 0.1,
              auroraActive: Math.random() > 0.8 ? Math.random() * 0.5 : 0,
              placeLabel: 'Dev Area'
            };
            tracker.update(metrics);
            console.log('[DevControls] Weather metrics:', metrics);
          }
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Development help text
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    console.log(`
🌦️ Social Weather Dev Controls:
  Shift+P: Toggle precipitation density
  Shift+L: Toggle lightning frequency
  Shift+C: Toggle cascade ripples
  Shift+R: Toggle replay mode (UI)
  Shift+T: Toggle time-lapse (direct)
  Shift+W: Force weather status update
    `);
  }, []);
  
  return null; // No visual component
}