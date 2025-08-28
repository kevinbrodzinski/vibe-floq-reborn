import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fn_uploadChatMedia } from '@/lib/chat/api';

type UploadInitResponse = {
  upload_url: string
  object_key: string
  bucket: string
}

export const useUploadMedia = (
  threadId: string,
  sendMessage: (p: { text: null; metadata: any }) => Promise<unknown>
) => {
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      // MIME filtering client-side
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error('Only image and video files are allowed');
      }

      const controller = new AbortController();
      setAbortController(controller);

      try {
        const { data } = await fn_uploadChatMedia<UploadInitResponse>({
          thread_id: threadId,
          filename: file.name,
          content_type: file.type,
          size: file.size,
        });

        const { upload_url, object_key, bucket } = data;

        const putRes = await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
          signal: controller.signal,
        });
        if (!putRes.ok) throw new Error('Upload failed');

        return await sendMessage({
          text: null,
          metadata: {
            media: { 
              bucket, 
              key: object_key, 
              type: file.type, 
              size: file.size 
            },
          },
        });
      } finally {
        setAbortController(null);
      }
    },
    onError: () => {
      setAbortController(null);
    },
  });

  const cancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  return { ...mutation, cancel };
};