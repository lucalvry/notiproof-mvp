import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=60, s-maxage=60',
  'X-Content-Type-Options': 'nosniff',
};

const WIDGET_VERSION = '9'; // v9: Enhanced campaign view tracking with detailed logging

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[widget-script] Starting widget.js fetch, version:', WIDGET_VERSION);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to fetch from Supabase Storage first (most reliable)
    console.log('[widget-script] Attempting to fetch from Supabase Storage...');
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('widget-assets')
      .download('widget.js');
    
    if (storageData && !storageError) {
      const script = await storageData.text();
      console.log('[widget-script] Successfully fetched from Storage, size:', script.length, 'bytes');
      
      // Validate it's actual JavaScript
      if (script.includes('NotiProof') && !script.includes('<!DOCTYPE')) {
        return new Response(script, {
          status: 200,
          headers: corsHeaders,
        });
      }
      console.warn('[widget-script] Storage content invalid, falling back...');
    } else {
      console.warn('[widget-script] Storage fetch failed:', storageError?.message || 'Unknown error');
    }
    
    // Fallback: Try Bunny CDN if configured
    const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME');
    if (BUNNY_CDN_HOSTNAME) {
      const bunnyUrl = `https://${BUNNY_CDN_HOSTNAME}/widget.js?v=${WIDGET_VERSION}`;
      console.log('[widget-script] Attempting Bunny CDN fetch:', bunnyUrl);
      
      try {
        const bunnyResponse = await fetch(bunnyUrl, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        
        if (bunnyResponse.ok) {
          const script = await bunnyResponse.text();
          if (script.includes('NotiProof') && !script.includes('<!DOCTYPE')) {
            console.log('[widget-script] Successfully fetched from Bunny CDN, size:', script.length, 'bytes');
            return new Response(script, {
              status: 200,
              headers: corsHeaders,
            });
          }
        }
        console.warn('[widget-script] Bunny CDN returned invalid content or', bunnyResponse.status);
      } catch (bunnyError) {
        console.warn('[widget-script] Bunny CDN fetch failed:', bunnyError);
      }
    }
    
    // Final fallback: Return a minimal loader that shows an error
    console.error('[widget-script] All sources failed, returning error script');
    const errorScript = `
(function() {
  console.error('[NotiProof] Widget failed to load from all sources. Please contact support.');
  console.error('[NotiProof] To fix: Upload widget.js to Supabase Storage bucket "widget-assets"');
})();
`;
    
    return new Response(errorScript, {
      status: 200, // Return 200 so script tag doesn't break
      headers: corsHeaders,
    });
    
  } catch (error) {
    console.error('[widget-script] Error serving widget:', error);
    return new Response(
      `console.error('NotiProof: Failed to load widget - ${error instanceof Error ? error.message : 'Unknown error'}');`,
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
