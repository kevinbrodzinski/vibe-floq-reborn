import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

const MAX_RETRIES = 3;

class MessagingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MessagingErrorBoundary] Error caught:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (e.g., Sentry)
    // reportError(error, { context: 'messaging', errorInfo });
  }

  handleRetry = () => {
    if (this.state.retryCount < MAX_RETRIES) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const canRetry = retryCount < MAX_RETRIES;
      const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');
      const isAuthError = error?.message?.includes('auth') || error?.message?.includes('unauthorized');

      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Messaging Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <MessageSquare className="h-4 w-4" />
              <AlertTitle>Something went wrong with messaging</AlertTitle>
              <AlertDescription>
                {isNetworkError && "Please check your internet connection and try again."}
                {isAuthError && "You may need to sign in again to continue messaging."}
                {!isNetworkError && !isAuthError && "An unexpected error occurred while loading messages."}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline" 
                  className="w-full"
                  disabled={false}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({MAX_RETRIES - retryCount} attempts left)
                </Button>
              )}
              
              <Button 
                onClick={this.handleReset} 
                variant="secondary" 
                className="w-full"
              >
                Reset Messaging
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 p-2 bg-muted rounded text-xs">
                <summary className="cursor-pointer font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default MessagingErrorBoundary;