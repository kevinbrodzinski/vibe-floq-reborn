import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LedgerLink } from '@/core/context/useRouterLedger';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-field text-foreground">
      <div className="text-center p-8 max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <LedgerLink to="/field">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </LedgerLink>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </button>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
