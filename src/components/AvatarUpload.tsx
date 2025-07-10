import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { uploadAvatar, deleteAvatar } from '@/lib/avatar';
import { useToast } from '@/hooks/use-toast';
import { XXLAvatar } from '@/components/ui/avatar-variants';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  displayName?: string | null;
  onAvatarChange?: (newAvatarUrl: string | null) => void;
  size?: number;
}

export const AvatarUpload = ({ 
  currentAvatarUrl, 
  displayName, 
  onAvatarChange,
  size = 96 
}: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const result = await uploadAvatar(file);
      
      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully"
      });

      onAvatarChange?.(result.path);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    setIsDeleting(true);

    try {
      const result = await deleteAvatar(currentAvatarUrl);
      
      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed"
      });

      onAvatarChange?.(null);
    } catch (error) {
      console.error('Avatar delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to remove avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <XXLAvatar 
          avatarPath={currentAvatarUrl}
          displayName={displayName}
          priority={true}
          enableBlur={true}
        />
        
        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <Camera className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isDeleting}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>

        {currentAvatarUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Removing...' : 'Remove'}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};