import { useCallback, useEffect, useRef } from 'react';
import { useAdvancedHaptics } from './useAdvancedHaptics';

interface AccessibleGestureOptions {
  onActivate?: () => void;
  onSecondaryAction?: () => void;
  onContextMenu?: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function useAccessibleGestures(options: AccessibleGestureOptions) {
  const { light, success } = useAdvancedHaptics();
  const elementRef = useRef<HTMLElement>(null);

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (options.disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        light();
        options.onActivate?.();
        break;
      
      case 'F10':
      case 'ContextMenu':
        event.preventDefault();
        options.onContextMenu?.();
        break;
      
      case 'ArrowRight':
        if (event.altKey) {
          event.preventDefault();
          success();
          options.onSecondaryAction?.();
        }
        break;
    }
  }, [options, light, success]);

  // Voice commands (simplified implementation)
  const handleVoiceCommand = useCallback((command: string) => {
    if (options.disabled) return;

    const normalizedCommand = command.toLowerCase().trim();
    
    if (normalizedCommand.includes('activate') || normalizedCommand.includes('select')) {
      options.onActivate?.();
    } else if (normalizedCommand.includes('menu') || normalizedCommand.includes('options')) {
      options.onContextMenu?.();
    } else if (normalizedCommand.includes('secondary') || normalizedCommand.includes('alternative')) {
      options.onSecondaryAction?.();
    }
  }, [options]);

  // Setup accessibility attributes and event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Set ARIA attributes
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', options.label);
    element.setAttribute('tabindex', options.disabled ? '-1' : '0');
    
    if (options.description) {
      element.setAttribute('aria-describedby', `${element.id || 'element'}-description`);
    }

    if (options.disabled) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }

    // Add keyboard listeners
    element.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, options.label, options.description, options.disabled]);

  // Screen reader announcements
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Focus management
  const manageFocus = useCallback((action: 'focus' | 'blur' | 'next' | 'previous') => {
    const element = elementRef.current;
    if (!element) return;

    switch (action) {
      case 'focus':
        element.focus();
        break;
      
      case 'blur':
        element.blur();
        break;
      
      case 'next':
        const nextElement = element.nextElementSibling as HTMLElement;
        if (nextElement && nextElement.tabIndex >= 0) {
          nextElement.focus();
        }
        break;
      
      case 'previous':
        const prevElement = element.previousElementSibling as HTMLElement;
        if (prevElement && prevElement.tabIndex >= 0) {
          prevElement.focus();
        }
        break;
    }
  }, []);

  // Generate accessibility props for the element
  const getA11yProps = () => ({
    ref: elementRef,
    role: 'button',
    'aria-label': options.label,
    'aria-describedby': options.description ? `${elementRef.current?.id || 'element'}-description` : undefined,
    'aria-disabled': options.disabled,
    tabIndex: options.disabled ? -1 : 0,
    onKeyDown: handleKeyDown,
    
    // Additional ARIA properties for rich interactions
    'aria-expanded': false, // Can be overridden for expandable elements
    'aria-haspopup': options.onContextMenu ? 'menu' : undefined,
    
    // Enhanced interaction hints
    'data-gesture-enabled': 'true',
    'data-voice-command': options.label.toLowerCase().replace(/\s+/g, '-'),
    
    // Screen reader friendly classes
    className: options.disabled ? 'disabled' : 'interactive'
  });

  // High contrast mode detection
  const isHighContrastMode = () => {
    return window.matchMedia('(prefers-contrast: high)').matches ||
           window.matchMedia('(-ms-high-contrast: active)').matches;
  };

  // Reduced motion detection
  const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  return {
    elementRef,
    getA11yProps,
    announceToScreenReader,
    manageFocus,
    handleVoiceCommand,
    
    // Accessibility state helpers
    isHighContrastMode,
    prefersReducedMotion,
    
    // Interaction helpers
    simulateActivation: () => {
      if (!options.disabled) {
        light();
        options.onActivate?.();
        announceToScreenReader(`${options.label} activated`);
      }
    },
    
    simulateSecondaryAction: () => {
      if (!options.disabled && options.onSecondaryAction) {
        success();
        options.onSecondaryAction();
        announceToScreenReader(`${options.label} secondary action performed`);
      }
    }
  };
}