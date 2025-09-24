import domToImage from 'dom-to-image-more';

/** Convert dataURL to Blob without network fetch */
function dataUrlToBlob(url: string): Blob {
  const byteString = atob(url.split(',')[1]);
  const mime = url.split(',')[0].match(/:(.*?);/)![1];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Renders a DOM node into a PNG Blob that can be downloaded or shared.
 * @param node HTMLElement to capture (must be in the document)
 * @returns Blob with image/png mime-type
 */
export async function captureNodeToPng(node: HTMLElement): Promise<Blob> {
  const dataUrl = await domToImage.toPng(node, {
    cacheBust: true,
    pixelRatio: window.devicePixelRatio || 2,
    bgcolor: '#0f172a', // tailwind slate-900 (fallback)
  });
  
  return dataUrlToBlob(dataUrl);
}

/** Safer share util with proper fallback and cleanup */
export async function shareOrDownload(blob: Blob, filename = 'afterglow.png') {
  const url = URL.createObjectURL(blob);
  const file = new File([blob], filename, { type: blob.type });

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: 'My Afterglow ✨' });
    } else {
      throw new Error('Web-Share unavailable');
    }
  } catch {
    // fallback download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    // always cleanup
    URL.revokeObjectURL(url);
  }
}