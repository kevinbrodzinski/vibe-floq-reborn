import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { verifyTransformCDN, getAvatarUrl } from '@/lib/avatar';

interface TransformCDNTesterProps {
  avatarPath?: string;
}

export const TransformCDNTester = ({ avatarPath }: TransformCDNTesterProps) => {
  const [results, setResults] = useState<Array<{
    size: number;
    url: string;
    working: boolean;
    loadTime: number;
  }>>([]);
  const [testing, setTesting] = useState(false);

  const testSizes = [32, 64, 128, 256];

  const runTests = async () => {
    if (!avatarPath) return;
    
    setTesting(true);
    setResults([]);
    
    const testResults = [];
    
    for (const size of testSizes) {
      const url = getAvatarUrl(avatarPath, size);
      if (!url) continue;
      
      const startTime = performance.now();
      const working = await verifyTransformCDN(url);
      const loadTime = performance.now() - startTime;
      
      testResults.push({ size, url, working, loadTime });
    }
    
    setResults(testResults);
    setTesting(false);
  };

  if (!avatarPath) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-center">
            Upload an avatar to test Transform CDN
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Transform CDN Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Test Transform CDN'}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Results:</h4>
            {results.map(({ size, working, loadTime }) => (
              <div key={size} className="flex items-center justify-between p-2 border rounded">
                <span>{size}px</span>
                <div className="flex items-center gap-2">
                  <Badge variant={working ? "default" : "destructive"}>
                    {working ? "✓" : "✗"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(loadTime)}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};