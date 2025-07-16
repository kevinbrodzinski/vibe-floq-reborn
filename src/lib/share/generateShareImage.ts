import domToImage from 'dom-to-image-more';

/**
 * Renders a DOM node into a PNG Blob that can be downloaded or shared.
 * @param node HTMLElement to capture (must be in the document)
 * @returns Blob with image/png mime-type
 */
export async function captureNodeToPng(node: HTMLElement): Promise<Blob> {
  const dataUrl = await domToImage.toPng(node, {
    cacheBust: true,
    quality: 1,
    pixelRatio: window.devicePixelRatio || 2,
    bgcolor: '#0f172a', // tailwind slate-900 (fallback)
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

/** Native share if supported – falls back to download */
export async function shareOrDownload(blob: Blob, filename = 'afterglow.png') {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: 'My Afterglow ✨' });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}