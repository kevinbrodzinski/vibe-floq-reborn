import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to error tracking service if available
    this.props.onError?.(error, errorInfo);
    
    // Auto-retry logic for network-related errors
    if (this.isRetryableError(error) && this.state.retryCount < 3) {
      this.retryTimeoutId = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          retryCount: prevState.retryCount + 1,
        }));
      }, 2000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isRetryableError(error: Error): boolean {
    return (
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('PGRST')
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      retryCount: 0,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            
            {this.state.retryCount > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                Retry attempt {this.state.retryCount}/3
              </p>
            )}
            
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button onClick={this.handleReload}>
                Reload App
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}