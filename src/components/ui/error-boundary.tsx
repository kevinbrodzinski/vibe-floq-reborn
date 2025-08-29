import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ErrorBoundaryClass extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Auto-retry for network errors
    if (this.isRetryableError(error) && this.state.retryCount < 3) {
      const delay = Math.pow(2, this.state.retryCount) * 1000; // Exponential backoff
      this.retryTimeoutId = window.setTimeout(() => {
        this.handleRetry();
      }, delay);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isRetryableError = (error: Error): boolean => {
    return error.message.includes('NetworkError') ||
           error.message.includes('fetch') ||
           error.message.includes('Loading chunk');
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {this.isRetryableError(this.state.error) 
                  ? "We're having trouble connecting. This usually resolves quickly."
                  : "An unexpected error occurred. Our team has been notified."}
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <summary className="cursor-pointer">Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  className="flex-1"
                  disabled={this.state.retryCount >= 3}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {this.state.retryCount >= 3 ? 'Max Retries' : 'Try Again'}
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Reload App
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component for navigation access
export function ErrorBoundary({ children, ...props }: Props) {
  return (
    <ErrorBoundaryClass {...props}>
      {children}
    </ErrorBoundaryClass>
  );
}

// Quick error fallback for components
export function QuickErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">Error Loading Component</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {error.message || 'Something went wrong'}
      </p>
      <Button size="sm" variant="outline" onClick={reset}>
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}