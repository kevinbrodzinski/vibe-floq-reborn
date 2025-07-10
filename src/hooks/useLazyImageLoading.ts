import { useEffect, useRef, useState } from 'react';

interface UseLazyImageLoadingOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Hook for lazy loading images with Intersection Observer
 */
export const useLazyImageLoading = (
  src: string | undefined,
  options: UseLazyImageLoadingOptions = {}
) => {
  const { threshold = 0.1, rootMargin = '50px' } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(img);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsLoaded(false);
  };

  return {
    imgRef,
    src: isVisible ? src : undefined,
    isLoaded,
    isVisible,
    onLoad: handleLoad,
    onError: handleError
  };
};