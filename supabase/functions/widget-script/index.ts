const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Content-Type-Options': 'nosniff',
};

const WIDGET_VERSION = Date.now().toString(); // Dynamic timestamp for cache busting
const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME');
const PROJECT_URL = 'https://af3e5dd6-226a-43be-b235-8448934d9210.lovableproject.com/widget.js';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[widget-script] Starting widget.js fetch, version:', WIDGET_VERSION);
    
    // Try Bunny CDN first if configured
    if (BUNNY_CDN_HOSTNAME) {
      const bunnyUrl = `https://${BUNNY_CDN_HOSTNAME}/widget/widget.js?v=${WIDGET_VERSION}`;
      console.log('[widget-script] Attempting Bunny CDN fetch:', bunnyUrl);
      
      try {
        const bunnyResponse = await fetch(bunnyUrl, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (bunnyResponse.ok) {
          const script = await bunnyResponse.text();
          console.log('[widget-script] Successfully fetched from Bunny CDN, size:', script.length, 'bytes');
          return new Response(script, {
            status: 200,
            headers: corsHeaders,
          });
        }
        console.warn('[widget-script] Bunny CDN returned', bunnyResponse.status, '- falling back to project URL');
      } catch (bunnyError) {
        console.warn('[widget-script] Bunny CDN fetch failed:', bunnyError, '- falling back to project URL');
      }
    }
    
    // Fall back to project URL (always fresh from Lovable)
    console.log('[widget-script] Fetching from project URL:', PROJECT_URL);
    const response = await fetch(PROJECT_URL, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error('[widget-script] Failed to fetch widget.js from project:', response.status);
      return new Response(`console.error('NotiProof: Failed to load widget - HTTP ${response.status}');`, {
        status: 500,
        headers: corsHeaders,
      });
    }
    
    const script = await response.text();
    console.log('[widget-script] Successfully fetched from project, size:', script.length, 'bytes');
    
    return new Response(script, {
      status: 200,
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
