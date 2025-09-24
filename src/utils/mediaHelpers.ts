export const getMediaURL = (media: { bucket: string; key: string }) => {
  if (!media?.bucket || !media?.key) return '';
  
  // Construct Supabase storage URL
  const supabaseUrl = 'https://reztyrrafsmlvvlqvsqt.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/${media.bucket}/${media.key}`;
};