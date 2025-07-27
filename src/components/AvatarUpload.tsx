import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { compressImageNative } from '@/lib/native/compressImage';
import { uploadAvatar, deleteAvatar } from '@/lib/avatar';
import { enqueueUpload } from '@/lib/offline/queue';
import { toast } from '@/hooks/use-toast';
import { useProgressHUD } from '@/hooks/useProgressHUD';
import { Loader2, Upload, Trash2, Camera } from 'lucide-react';
import { clearAvatarUrlCache } from '@/hooks/useAvatarUrl';
import { XXLAvatar } from '@/components/ui/avatar-variants';
import { Button } from '@/components/ui/button';

interface Props {
  currentAvatarUrl: string | null;
  displayName?: string | null;
  onAvatarChange: (url: string | null) => void;
  size?: number;           // pixel size of preview circle
}

export function AvatarUpload({ currentAvatarUrl, displayName, onAvatarChange, size = 96 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hud = useProgressHUD();

  /* ---------- Compression for Web ---------- */
  const compressImageWeb = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> => {
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

  /* ---------- Helpers ---------- */
  const pickNative = async () => {
    if (Platform.OS === 'web') return;
    
    const ImagePicker = require('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({ title: 'Permission required', description: 'Camera access is needed to upload photos', variant: 'destructive' });
      return;
    }

    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    
    if (pick.canceled) return;
    
    const { uri } = await compressImageNative(pick.assets[0].uri);
    const file = await uriToFile(uri, `${globalThis.crypto.randomUUID()}.jpg`);
    await uploadFlow(file);
  };

  const pickWeb = () => inputRef.current?.click();

  const uploadFlow = async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please select an image smaller than 5MB', variant: 'destructive' });
        return;
      }
      
      setIsUploading(true);
      hud.show('Uploading avatar...');
      
      // Clear cache for old avatar
      if (currentAvatarUrl) {
        clearAvatarUrlCache(currentAvatarUrl);
      }
      
      const result = await uploadAvatar(file);
      
      if (result.error) throw new Error(result.error);

      if (result.path) {
        clearAvatarUrlCache(result.path);
        onAvatarChange(result.path);
        
        // Haptic feedback for success
        if (Platform.OS !== 'web') {
          const Haptics = require('expo-haptics');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        toast({ title: 'Avatar updated', description: 'Your profile picture has been updated successfully' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      
      // Haptic feedback for error
      if (Platform.OS !== 'web') {
        const Haptics = require('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      // offline or failure: enqueue for retry
      if (Platform.OS !== 'web') {
        enqueueUpload({ localUri: fileToUri(file), ts: Date.now() });
        toast({ title: 'Queued for upload', description: 'Will upload when online' });
      } else {
        toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
      }
    } finally {
      setIsUploading(false);
      hud.hide();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    setIsDeleting(true);
    hud.show('Removing avatar...');

    try {
      const result = await deleteAvatar(currentAvatarUrl);
      
      if (result.error) throw new Error(result.error);

      // Clear cache for deleted avatar
      clearAvatarUrlCache(currentAvatarUrl);

      // Haptic feedback for success
      if (Platform.OS !== 'web') {
        const Haptics = require('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      toast({ title: 'Avatar removed', description: 'Your profile picture has been removed' });
      onAvatarChange(null);
    } catch (error) {
      console.error('Avatar delete error:', error);
      
      // Haptic feedback for error
      if (Platform.OS !== 'web') {
        const Haptics = require('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      toast({
        title: 'Delete failed',
        description: 'Failed to remove avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      hud.hide();
    }
  };

  const handleWebFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Compress for web
    const compressedFile = await compressImageWeb(file);
    await uploadFlow(compressedFile);
  };

  /* ---------- Render ---------- */
  return (
    <>
      <hud.Portal />
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <XXLAvatar 
            avatarPath={currentAvatarUrl}
            displayName={displayName}
            priority={true}
            enableBlur={true}
          />
          
          {/* Upload overlay */}
          <div 
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer"
            onClick={Platform.OS === 'web' ? pickWeb : pickNative}
          >
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Hidden file input for Web */}
        {Platform.OS === 'web' && (
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleWebFileSelect}
          />
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={Platform.OS === 'web' ? pickWeb : pickNative}
            disabled={isUploading || isDeleting}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>

          {currentAvatarUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isUploading || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/* util helpers */
async function uriToFile(uri: string, filename: string) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

function fileToUri(file: File) {
  return URL.createObjectURL(file); // used for queue fallback
}