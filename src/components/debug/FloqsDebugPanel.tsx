
import { useActiveFloqs } from "@/hooks/useActiveFloqs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEnvironmentDebug } from "@/hooks/useEnvironmentDebug";
import { zIndex } from "@/constants/z";

export const FloqsDebugPanel = () => {
  const { data: floqs = [], isLoading, error } = useActiveFloqs();
  const { setIsDebugPanelOpen, environmentConfig } = useEnvironmentDebug();

  return (
    <Card className="fixed bottom-4 right-4 w-80 bg-card/95 backdrop-blur-sm" {...zIndex('debug')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Debug Panel</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsDebugPanelOpen(true)}
            className="text-xs"
          >
            Env Config
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {/* Environment Status */}
        <div className="border-b pb-2">
          <div className="flex items-center justify-between">
            <strong>Environment:</strong>
            <Badge className={
              environmentConfig.presenceMode === 'live' ? 'bg-green-500' : 
              environmentConfig.presenceMode === 'mock' ? 'bg-yellow-500' : 'bg-gray-500'
            }>
              {environmentConfig.presenceMode.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        {/* Floqs Status */}
        <div>
          <strong>Status:</strong> {isLoading ? "Loading..." : error ? "Error" : "Loaded"}
        </div>
        {error && (
          <div className="text-destructive">
            <strong>Error:</strong> {error.message}
          </div>
        )}
        <div>
          <strong>Count:</strong> {Array.isArray(floqs) ? floqs.length : 'pages' in floqs ? floqs.pages.flat().length : 0} floqs
        </div>
        {(Array.isArray(floqs) ? floqs.length : 'pages' in floqs ? floqs.pages.flat().length : 0) > 0 && (
          <div className="space-y-1">
            <strong>First Floq:</strong>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify((Array.isArray(floqs) ? floqs : 'pages' in floqs ? floqs.pages.flat() : [])[0], null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
