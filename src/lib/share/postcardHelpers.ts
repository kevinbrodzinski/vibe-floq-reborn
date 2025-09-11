import { generatePostcardClient, type PostcardOptions } from './generatePostcardClient';
import { haptics } from '@/utils/haptics';

/**
 * Generate and download a postcard with haptic feedback
 */
export async function downloadPostcard(options: PostcardOptions, filename?: string) {
  try {
    haptics.tap();
    
    const blob = await generatePostcardClient(options);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `floq-postcard-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    haptics.success();
    
    return { success: true };
  } catch (error) {
    haptics.error();
    console.error('Postcard download failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Share a postcard using Web Share API with fallback to download
 */
export async function sharePostcard(options: PostcardOptions, shareData?: ShareData) {
  try {
    haptics.tap();
    
    const blob = await generatePostcardClient(options);
    
    // Try Web Share API first
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'postcard.png', { type: 'image/png' })] })) {
      const file = new File([blob], 'postcard.png', { type: 'image/png' });
      await navigator.share({
        title: options.title,
        text: shareData?.text || 'Check out my flow journey!',
        files: [file],
        ...shareData
      });
      
      haptics.success();
      return { success: true, method: 'share' };
    } else {
      // Fallback to download
      const result = await downloadPostcard(options);
      return { ...result, method: 'download' };
    }
  } catch (error) {
    haptics.error();
    console.error('Postcard share failed:', error);
    
    // Fallback to download on share failure
    if (error instanceof Error && error.name !== 'AbortError') {
      const result = await downloadPostcard(options);
      return { ...result, method: 'download-fallback' };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}