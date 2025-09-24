import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  planId?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ExecutionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Execution Error Boundary caught an error:', error, errorInfo);
    }

    // Store planId and error info for debugging
    if (this.props.planId) {
      localStorage.setItem(`execution-error-${this.props.planId}`, JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        planId: this.props.planId
      }));
    }

    // Log to Supabase in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToSupabase(error, errorInfo);
    }
  }

  private async logErrorToSupabase(error: Error, errorInfo: ErrorInfo) {
    try {
      await supabase.from('edge_invocation_logs').insert({
        function_name: 'execution_error_boundary',
        status: 'error',
        error_message: error.message,
        metadata: {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          planId: this.props.planId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      } as any);
    } catch (logError) {
      console.error('Failed to log error to Supabase:', logError);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Execution Error
              </h2>
              <p className="text-muted-foreground">
                Something went wrong during plan execution. Don't worry, your progress has been saved.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">
                  Error Details (Dev Only)
                </summary>
                <div className="text-xs font-mono space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={this.handleRetry} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={this.handleReload}
                  className="flex-1"
                >
                  Reload Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}