import { useActiveFloqs } from "@/hooks/useActiveFloqs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const FloqsDebugPanel = () => {
  const { data: floqs = [], isLoading, error } = useActiveFloqs({
    limit: 5,
    includeDistance: true
  });

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Floqs Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <strong>Status:</strong> {isLoading ? "Loading..." : error ? "Error" : "Loaded"}
        </div>
        {error && (
          <div className="text-destructive">
            <strong>Error:</strong> {error.message}
          </div>
        )}
        <div>
          <strong>Count:</strong> {floqs.length} floqs
        </div>
        {floqs.length > 0 && (
          <div className="space-y-1">
            <strong>First Floq:</strong>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(floqs[0], null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};