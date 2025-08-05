import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvitationsModal } from '@/components/plan/InvitationsModal';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function InvitationsPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true);

  const handleModalClose = () => {
    setModalOpen(false);
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Plan Invitations</h1>
        </div>

        {/* Content */}
        <div className="text-center text-muted-foreground">
          <p>Your invitations are displayed in the modal.</p>
        </div>
      </div>

      {/* Modal */}
      <InvitationsModal 
        open={modalOpen}
        onOpenChange={handleModalClose}
      />
    </div>
  );
}