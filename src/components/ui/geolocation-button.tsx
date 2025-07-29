import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeo } from "@/hooks/useGeo";

interface GeolocationButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const GeolocationButton = ({ 
  className, 
  variant = "outline", 
  size = "default" 
}: GeolocationButtonProps) => {
  const { coords, status, error, hasPermission, requestLocation } = useGeo();
  const lat = coords?.lat;
  const lng = coords?.lng;
  const loading = status === 'loading';
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      await requestLocation();
    } finally {
      setIsRequesting(false);
    }
  };

  const isLoading = loading || isRequesting;
  const hasLocation = !!(lat && lng);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRequest}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Getting location...
        </>
      ) : hasLocation ? (
        <>
          <MapPin className="h-4 w-4 mr-2 text-green-500" />
          Location enabled
        </>
      ) : (
        <>
          <MapPin className="h-4 w-4 mr-2" />
          {error ? "Retry location" : "Enable location"}
        </>
      )}
    </Button>
  );
};