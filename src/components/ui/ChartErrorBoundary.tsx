import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for chart components to prevent crashes on malformed pattern data
 */
export class ChartErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ChartErrorBoundary] Chart error caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`flex flex-col items-center justify-center p-6 text-center bg-muted/20 rounded-lg border border-border/30 ${this.props.className || ''}`}>
          <AlertTriangle className="w-8 h-8 text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Chart unavailable</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Not enough pattern data to display visualization. Continue using the app to see insights here.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 */
export function withChartErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ChartErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ChartErrorBoundary>
    );
  };
}

/**
 * Sample size guard for pattern visualizations
 */
export function PatternDataGuard({ 
  sampleCount, 
  minSamples = 3, 
  children, 
  className = ''
}: {
  sampleCount: number;
  minSamples?: number;
  children: ReactNode;
  className?: string;
}) {
  if (sampleCount < minSamples) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center bg-muted/10 rounded-lg ${className}`}>
        <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-transparent rounded-full animate-pulse"></div>
        </div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Building patterns</h3>
        <p className="text-xs text-muted-foreground/70 max-w-xs">
          {sampleCount}/{minSamples} corrections needed to show reliable patterns
        </p>
        <div className="w-full bg-muted/20 rounded-full h-1 mt-3 max-w-24">
          <div 
            className="bg-accent h-1 rounded-full transition-all duration-500" 
            style={{ width: `${(sampleCount / minSamples) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}