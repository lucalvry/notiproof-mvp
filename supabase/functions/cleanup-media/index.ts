import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  success: boolean;
  processed: number;
  deleted: number;
  failed: number;
  bytes_freed: number;
  errors: Array<{ url: string; error: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[cleanup-media] Starting scheduled media cleanup...');

  try {
    // Use service role for scheduled cleanup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Bunny CDN configuration
    const BUNNY_MEDIA_ZONE = Deno.env.get('BUNNY_MEDIA_ZONE');
    const BUNNY_MEDIA_PASSWORD = Deno.env.get('BUNNY_MEDIA_PASSWORD');
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_STORAGE_PASSWORD = Deno.env.get('BUNNY_STORAGE_PASSWORD');

    const storageZone = BUNNY_MEDIA_ZONE || BUNNY_STORAGE_ZONE;
    const storagePassword = BUNNY_MEDIA_PASSWORD || BUNNY_STORAGE_PASSWORD;

    if (!storageZone || !storagePassword) {
      console.error('[cleanup-media] Bunny CDN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Bunny CDN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse optional parameters
    let daysThreshold = 30;
    let dryRun = false;

    try {
      const body = await req.json();
      daysThreshold = body.days_threshold || 30;
      dryRun = body.dry_run || false;
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`[cleanup-media] Parameters: daysThreshold=${daysThreshold}, dryRun=${dryRun}`);

    // Get media pending cleanup (older than threshold)
    const { data: pendingMedia, error: fetchError } = await supabase
      .rpc('get_media_pending_cleanup', { _days_threshold: daysThreshold });

    if (fetchError) {
      console.error('[cleanup-media] Error fetching pending media:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch pending media' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mediaToCleanup = pendingMedia || [];
    console.log(`[cleanup-media] Found ${mediaToCleanup.length} media files pending cleanup`);

    if (dryRun) {
      const totalBytes = mediaToCleanup.reduce((sum: number, m: any) => sum + (m.file_size || 0), 0);
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          pending_count: mediaToCleanup.length,
          pending_bytes: totalBytes,
          files: mediaToCleanup.map((m: any) => ({
            id: m.id,
            url: m.cdn_url,
            size: m.file_size,
            deleted_at: m.deleted_at,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: CleanupResult = {
      success: true,
      processed: mediaToCleanup.length,
      deleted: 0,
      failed: 0,
      bytes_freed: 0,
      errors: [],
    };

    const deletedIds: string[] = [];

    for (const media of mediaToCleanup) {
      try {
        // Extract path from CDN URL
        const urlObj = new URL(media.cdn_url);
        const filePath = urlObj.pathname.slice(1);

        if (!filePath) {
          result.errors.push({ url: media.cdn_url, error: 'Invalid URL format' });
          result.failed++;
          continue;
        }

        // Delete from Bunny CDN Storage
        const deleteUrl = `https://storage.bunnycdn.com/${storageZone}/${filePath}`;
        console.log(`[cleanup-media] Deleting: ${filePath}`);

        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 'AccessKey': storagePassword },
        });

        if (deleteResponse.ok || deleteResponse.status === 404) {
          // Success or already deleted
          result.deleted++;
          result.bytes_freed += media.file_size || 0;
          deletedIds.push(media.id);
        } else {
          const errorText = await deleteResponse.text();
          console.error(`[cleanup-media] Failed: ${filePath} - ${deleteResponse.status}`);
          result.errors.push({ url: media.cdn_url, error: `HTTP ${deleteResponse.status}: ${errorText}` });
          result.failed++;
        }
      } catch (error) {
        console.error(`[cleanup-media] Error processing ${media.cdn_url}:`, error);
        result.errors.push({ 
          url: media.cdn_url, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        result.failed++;
      }
    }

    // Delete successfully processed media records from database
    if (deletedIds.length > 0) {
      const { error: purgeError } = await supabase
        .rpc('purge_deleted_media', { _media_ids: deletedIds });

      if (purgeError) {
        console.error('[cleanup-media] Error purging media records:', purgeError);
      } else {
        console.log(`[cleanup-media] Purged ${deletedIds.length} media records from database`);
      }
    }

    result.success = result.failed === 0;

    const duration_ms = Date.now() - startTime;

    // Log the cleanup operation
    await supabase.from('integration_logs').insert({
      integration_type: 'bunny_cdn',
      action: 'scheduled_cleanup',
      status: result.success ? 'success' : 'partial',
      details: {
        processed: result.processed,
        deleted: result.deleted,
        failed: result.failed,
        bytes_freed: result.bytes_freed,
        days_threshold: daysThreshold,
      },
      duration_ms,
    });

    console.log(`[cleanup-media] Complete: ${result.deleted} deleted, ${result.failed} failed, ${result.bytes_freed} bytes freed`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[cleanup-media] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
