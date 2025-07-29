import { useMutation } from '@tanstack/react-query';
import { fn_uploadChatMedia } from '@/lib/chat/api';

export const useUploadMedia = (
  threadId: string,
  sendMessage: (p: { text: null; metadata: any }) => Promise<unknown>
) =>
  useMutation({
    mutationFn: async (file: File) => {
      const { data, error } = await fn_uploadChatMedia({
        thread_id: threadId,
        filename: file.name,
        content_type: file.type,
        size: file.size,
      });
      if (error) throw error;

      const { upload_url, object_key, bucket } = data!;

      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Upload failed');

      await sendMessage({
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
    },
  });