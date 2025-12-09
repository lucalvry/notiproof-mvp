import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  total_testimonials: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{
    testimonial_id: string;
    field: string;
    error: string;
  }>;
  details: Array<{
    testimonial_id: string;
    field: string;
    old_url: string;
    new_url: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bunnyHostname = Deno.env.get('BUNNY_CDN_HOSTNAME');
    
    if (!bunnyHostname) {
      throw new Error('BUNNY_CDN_HOSTNAME environment variable not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin or superadmin using RPC
    console.log('[Migration] Checking admin status for user:', user.id);
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('is_admin', { _user_id: user.id });

    console.log('[Migration] Admin check result:', { isAdmin, roleError });

    if (roleError) {
      console.error('[Migration] Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Authorization check failed', details: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin) {
      console.log('[Migration] User does not have admin role');
      return new Response(JSON.stringify({ 
        error: 'Admin access required',
        hint: 'Please ensure your user has an admin or superadmin role in the user_roles table'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Migration] Admin access granted');

    const { dryRun = false } = await req.json().catch(() => ({ dryRun: false }));

    const result: MigrationResult = {
      success: true,
      total_testimonials: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      details: [],
    };

    // Query testimonials with Supabase storage URLs
    const { data: testimonials, error: fetchError } = await supabase
      .from('testimonials')
      .select('id, author_avatar_url, video_url, website_id')
      .or('author_avatar_url.like.%supabase.co/storage%,video_url.like.%supabase.co/storage%');

    if (fetchError) {
      throw fetchError;
    }

    result.total_testimonials = testimonials?.length || 0;
    console.log(`[Migration] Found ${result.total_testimonials} testimonials with Supabase storage URLs`);

    for (const testimonial of testimonials || []) {
      // Migrate avatar
      if (testimonial.author_avatar_url?.includes('supabase.co/storage')) {
        try {
          console.log(`[Migration] Migrating avatar for testimonial ${testimonial.id}`);
          const newUrl = await migrateFile(
            testimonial.author_avatar_url,
            testimonial.website_id,
            'avatar',
            supabase,
            supabaseUrl,
            authHeader
          );

          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('testimonials')
              .update({ author_avatar_url: newUrl })
              .eq('id', testimonial.id);

            if (updateError) throw updateError;
          }

          result.details.push({
            testimonial_id: testimonial.id,
            field: 'author_avatar_url',
            old_url: testimonial.author_avatar_url,
            new_url: newUrl,
          });
          result.migrated++;
          console.log(`[Migration] ✓ Avatar migrated successfully`);
        } catch (error) {
          console.error(`[Migration] ✗ Failed to migrate avatar for ${testimonial.id}:`, error);
          result.errors.push({
            testimonial_id: testimonial.id,
            field: 'author_avatar_url',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.failed++;
        }
      }

      // Migrate video
      if (testimonial.video_url?.includes('supabase.co/storage')) {
        try {
          console.log(`[Migration] Migrating video for testimonial ${testimonial.id}`);
          const newUrl = await migrateFile(
            testimonial.video_url,
            testimonial.website_id,
            'video',
            supabase,
            supabaseUrl,
            authHeader
          );

          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('testimonials')
              .update({ video_url: newUrl })
              .eq('id', testimonial.id);

            if (updateError) throw updateError;
          }

          result.details.push({
            testimonial_id: testimonial.id,
            field: 'video_url',
            old_url: testimonial.video_url,
            new_url: newUrl,
          });
          result.migrated++;
          console.log(`[Migration] ✓ Video migrated successfully`);
        } catch (error) {
          console.error(`[Migration] ✗ Failed to migrate video for ${testimonial.id}:`, error);
          result.errors.push({
            testimonial_id: testimonial.id,
            field: 'video_url',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        dryRun,
        message: dryRun 
          ? 'Dry run complete - no changes made. Set dryRun=false to execute migration.' 
          : 'Migration complete',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function migrateFile(
  supabaseStorageUrl: string,
  websiteId: string,
  fileType: 'avatar' | 'video',
  supabase: any,
  supabaseUrl: string,
  authHeader: string
): Promise<string> {
  // Extract the file path from Supabase URL
  const urlMatch = supabaseStorageUrl.match(/\/storage\/v1\/object\/public\/testimonials\/(.*)/);
  if (!urlMatch) {
    throw new Error('Invalid Supabase storage URL format');
  }
  
  const filePath = urlMatch[1];
  console.log(`[Migration] Downloading file from Supabase Storage: ${filePath}`);

  // Download from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('testimonials')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download file from Supabase: ${downloadError?.message || 'Unknown error'}`);
  }

  console.log(`[Migration] File downloaded, size: ${fileData.size} bytes, type: ${fileData.type}`);

  // Get file extension and name
  const extension = filePath.split('.').pop() || '';
  const fileName = filePath.split('/').pop() || `file.${extension}`;

  // Convert blob to File object
  const file = new File([fileData], fileName, { type: fileData.type });

  // Upload to Bunny CDN via bunny-upload function
  const targetPath = fileType === 'avatar' 
    ? `testimonial-avatars/${websiteId}/${fileName}`
    : `testimonial-videos/${websiteId}/${fileName}`;

  console.log(`[Migration] Uploading to Bunny CDN: ${targetPath}`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', targetPath);
  formData.append('migration_mode', 'true');

  const uploadResponse = await fetch(
    `${supabaseUrl}/functions/v1/bunny-upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Bunny CDN upload failed (HTTP ${uploadResponse.status}): ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  
  if (!uploadResult.success || !uploadResult.url) {
    throw new Error(`Bunny CDN upload failed: ${uploadResult.error || 'Unknown error'}`);
  }

  console.log(`[Migration] Successfully uploaded to Bunny CDN: ${uploadResult.url}`);
  return uploadResult.url;
}
