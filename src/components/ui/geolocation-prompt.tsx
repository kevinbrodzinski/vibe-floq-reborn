import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Shield } from "lucide-react";

interface GeolocationPromptProps {
  onRequestLocation: () => void;
  isLoading?: boolean;
}

export function GeolocationPrompt({ onRequestLocation, isLoading }: GeolocationPromptProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle>Enable Location Access</CardTitle>
        <CardDescription>
          We need your location to show nearby venues and friends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3 text-sm text-muted-foreground">
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            Your location is only used to enhance your experience and is never shared without your permission.
          </div>
        </div>
        <Button 
          onClick={onRequestLocation}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Requesting..." : "Allow Location Access"}
        </Button>
      </CardContent>
    </Card>
  );
}