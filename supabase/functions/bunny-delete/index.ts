import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  urls?: string[];
  media_ids?: string[];
  mark_only?: boolean; // If true, only mark for deletion in DB, don't delete from CDN yet
}

interface DeleteResult {
  url: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin (only admins can delete media)
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DeleteRequest = await req.json();
    const { urls = [], media_ids = [], mark_only = false } = body;

    console.log(`[bunny-delete] Starting deletion for ${urls.length} URLs, ${media_ids.length} media IDs`);

    // Get Bunny CDN configuration
    const BUNNY_MEDIA_ZONE = Deno.env.get('BUNNY_MEDIA_ZONE');
    const BUNNY_MEDIA_PASSWORD = Deno.env.get('BUNNY_MEDIA_PASSWORD');
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_STORAGE_PASSWORD = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME');

    const storageZone = BUNNY_MEDIA_ZONE || BUNNY_STORAGE_ZONE;
    const storagePassword = BUNNY_MEDIA_PASSWORD || BUNNY_STORAGE_PASSWORD;

    if (!storageZone || !storagePassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bunny CDN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all URLs to delete
    let allUrls = [...urls];

    // If media_ids provided, fetch their URLs
    if (media_ids.length > 0) {
      const { data: mediaRecords, error: mediaError } = await supabase
        .from('media')
        .select('id, cdn_url')
        .in('id', media_ids);

      if (mediaError) {
        console.error('[bunny-delete] Error fetching media records:', mediaError);
      } else if (mediaRecords) {
        allUrls = [...allUrls, ...mediaRecords.map(m => m.cdn_url)];
      }
    }

    // Remove duplicates
    allUrls = [...new Set(allUrls)];

    console.log(`[bunny-delete] Total unique URLs to process: ${allUrls.length}`);

    const results: DeleteResult[] = [];
    let deletedCount = 0;
    let failedCount = 0;
    let totalBytesFreed = 0;

    for (const cdnUrl of allUrls) {
      try {
        // Extract path from CDN URL
        // URL format: https://hostname.b-cdn.net/path/to/file.ext
        const urlObj = new URL(cdnUrl);
        const filePath = urlObj.pathname.slice(1); // Remove leading slash

        if (!filePath) {
          results.push({ url: cdnUrl, success: false, error: 'Invalid URL format' });
          failedCount++;
          continue;
        }

        if (mark_only) {
          // Just mark in database, don't delete from CDN
          results.push({ url: cdnUrl, success: true });
          deletedCount++;
          continue;
        }

        // Delete from Bunny CDN Storage
        const deleteUrl = `https://storage.bunnycdn.com/${storageZone}/${filePath}`;
        console.log(`[bunny-delete] Deleting: ${deleteUrl}`);

        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'AccessKey': storagePassword,
          },
        });

        if (deleteResponse.ok || deleteResponse.status === 404) {
          // 404 means file doesn't exist, which is fine (already deleted)
          results.push({ url: cdnUrl, success: true });
          deletedCount++;

          // Update media table to mark as deleted or remove
          const { data: mediaRecord } = await supabase
            .from('media')
            .select('file_size')
            .eq('cdn_url', cdnUrl)
            .single();

          if (mediaRecord?.file_size) {
            totalBytesFreed += mediaRecord.file_size;
          }

          // Delete from media table
          await supabase
            .from('media')
            .delete()
            .eq('cdn_url', cdnUrl);

        } else {
          const errorText = await deleteResponse.text();
          console.error(`[bunny-delete] Failed to delete ${filePath}: ${deleteResponse.status} - ${errorText}`);
          results.push({ url: cdnUrl, success: false, error: `HTTP ${deleteResponse.status}` });
          failedCount++;
        }
      } catch (error) {
        console.error(`[bunny-delete] Error processing ${cdnUrl}:`, error);
        results.push({ url: cdnUrl, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        failedCount++;
      }
    }

    const duration_ms = Date.now() - startTime;

    // Log the operation
    await supabase.from('integration_logs').insert({
      integration_type: 'bunny_cdn',
      action: 'delete',
      status: failedCount === 0 ? 'success' : 'partial',
      user_id: user.id,
      details: {
        total_urls: allUrls.length,
        deleted: deletedCount,
        failed: failedCount,
        bytes_freed: totalBytesFreed,
        mark_only,
      },
      duration_ms,
    });

    console.log(`[bunny-delete] Complete: ${deletedCount} deleted, ${failedCount} failed, ${totalBytesFreed} bytes freed`);

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        deleted: deletedCount,
        failed: failedCount,
        bytes_freed: totalBytesFreed,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[bunny-delete] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
