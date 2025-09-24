import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧹 Starting orphaned avatar cleanup...');

    // Get all files in avatars bucket
    const { data: files, error: filesError } = await supabase
      .storage
      .from('avatars')
      .list('', { limit: 1000 });

    if (filesError) {
      console.error('Error listing files:', filesError);
      throw filesError;
    }

    // Get all avatar URLs from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('avatar_url');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Extract file names from avatar URLs
    const usedPaths = new Set(
      profiles
        ?.map(p => p.avatar_url?.split('/').pop())
        .filter(Boolean) || []
    );

    // Find orphaned files
    const orphaned = files?.filter(file => 
      file.name && 
      !usedPaths.has(file.name) &&
      file.name !== '.emptyFolderPlaceholder'
    ) || [];

    console.log(`📊 Found ${files?.length || 0} total files, ${usedPaths.size} in use, ${orphaned.length} orphaned`);

    // Delete orphaned files
    let deletedCount = 0;
    for (const file of orphaned) {
      const { error: deleteError } = await supabase
        .storage
        .from('avatars')
        .remove([file.name]);

      if (deleteError) {
        console.error(`Failed to delete ${file.name}:`, deleteError);
      } else {
        deletedCount++;
        console.log(`🗑️ Deleted orphaned file: ${file.name}`);
      }
    }

    const result = {
      success: true,
      totalFiles: files?.length || 0,
      filesInUse: usedPaths.size,
      orphanedFound: orphaned.length,
      deletedCount,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Cleanup completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});