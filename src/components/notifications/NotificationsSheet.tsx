import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NotificationsList } from './NotificationsList';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationsSheet = ({ open, onOpenChange }: NotificationsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          <NotificationsList />
        </div>
      </SheetContent>
    </Sheet>
  );
};