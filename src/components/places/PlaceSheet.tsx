import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/RatingStars";
import { usePlaceDetails } from "@/hooks/usePlaceDetails";

type Props = {
  placeId: string | null;
  open: boolean;
  onOpenChange(open: boolean): void;
};

export const PlaceSheet = ({ placeId, open, onOpenChange }: Props) => {
  const { data, isLoading } = usePlaceDetails(placeId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : data ? (
          <>
            <SheetTitle className="text-lg font-semibold">
              {data.displayName.text}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {data.formattedAddress}
            </p>
            {data.rating && (
              <RatingStars rating={data.rating} count={data.userRatingCount} />
            )}
            {data.googleMapsUri && (
              <a
                href={data.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                View in Google&nbsp;Maps
              </a>
            )}
          </>
        ) : (
          <p className="text-sm">Unable to load place details.</p>
        )}
      </SheetContent>
    </Sheet>
  );
};