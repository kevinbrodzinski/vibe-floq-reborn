import { useState, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  loop?: boolean;
}

export const useKeyboardNavigation = ({ 
  itemCount, 
  onSelect, 
  loop = false 
}: UseKeyboardNavigationOptions) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev <= 0) return loop ? itemCount - 1 : 0;
          return prev - 1;
        });
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev >= itemCount - 1) return loop ? 0 : itemCount - 1;
          return prev + 1;
        });
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < itemCount) {
          onSelect(selectedIndex);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setSelectedIndex(-1);
        break;
    }
  }, [itemCount, onSelect, loop, selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown
  };
};