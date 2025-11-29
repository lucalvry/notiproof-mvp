import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
  details?: {
    file_size: number;
    upload_time_ms: number;
    cdn_url: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Check if user is admin or superadmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Deploy Widget] Starting widget.js deployment to Bunny CDN');
    const startTime = Date.now();

    // Fetch widget.js from the project
    const widgetJsUrl = 'https://af3e5dd6-226a-43be-b235-8448934d9210.lovableproject.com/widget.js';
    console.log('[Deploy Widget] Fetching widget.js from:', widgetJsUrl);
    
    const widgetResponse = await fetch(widgetJsUrl);
    
    if (!widgetResponse.ok) {
      throw new Error(`Failed to fetch widget.js: HTTP ${widgetResponse.status}`);
    }

    const widgetBlob = await widgetResponse.blob();
    console.log('[Deploy Widget] Widget.js fetched, size:', widgetBlob.size, 'bytes');

    // Convert to File object
    const widgetFile = new File([widgetBlob], 'widget.js', { type: 'application/javascript' });

    // Upload to Bunny CDN via bunny-upload function (assets zone)
    const formData = new FormData();
    formData.append('file', widgetFile);
    formData.append('path', 'widget/widget.js');
    formData.append('zone', 'assets'); // Use assets zone for static files

    console.log('[Deploy Widget] Uploading to Bunny CDN...');
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

    const uploadTime = Date.now() - startTime;
    console.log('[Deploy Widget] Successfully deployed widget.js to Bunny CDN:', uploadResult.url);
    console.log('[Deploy Widget] Upload took:', uploadTime, 'ms');

    const result: DeployResult = {
      success: true,
      url: uploadResult.url,
      details: {
        file_size: widgetBlob.size,
        upload_time_ms: uploadTime,
        cdn_url: uploadResult.url,
      },
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Deploy Widget] Fatal error:', error);
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
