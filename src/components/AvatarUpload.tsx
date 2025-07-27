import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { uploadAvatar, deleteAvatar } from '@/lib/avatar';
import { useToast } from '@/hooks/use-toast';
import { XXLAvatar } from '@/components/ui/avatar-variants';
import { clearAvatarUrlCache } from '@/hooks/useAvatarUrl';

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

  // Image compression function for mobile uploads
  const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

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

    // Validate file size (10MB limit, increased for better compatibility)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Compress image for better performance and storage efficiency
      const compressedFile = await compressImage(file);
      
      const result = await uploadAvatar(compressedFile);
      
      if (result.error) {
        throw result.error;
      }

      // Clear cache for the new avatar
      if (result.path) {
        clearAvatarUrlCache(result.path);
      }

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully"
      });

      // Use the path (which is now the public URL)
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

      // Clear cache for deleted avatar
      clearAvatarUrlCache(currentAvatarUrl);

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
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};