import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployResult {
  success: boolean;
  url?: string;
  storage_url?: string;
  error?: string;
  details?: {
    file_size: number;
    upload_time_ms: number;
    cdn_url?: string;
    storage_url: string;
    source: string;
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

    // Check if user is admin or superadmin using RPC
    console.log('[Deploy Widget] Checking admin status for user:', user.id);
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('is_admin', { _user_id: user.id });

    if (roleError) {
      console.error('[Deploy Widget] Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Authorization check failed', details: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Admin access required',
        hint: 'Please ensure your user has an admin or superadmin role'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Deploy Widget] Admin access granted');
    const startTime = Date.now();

    // Check if request has file upload (multipart form)
    const contentType = req.headers.get('content-type') || '';
    let widgetContent: string;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle direct file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      widgetContent = await file.text();
      console.log('[Deploy Widget] Received file upload, size:', widgetContent.length, 'bytes');
    } else {
      // Try to get content from request body (JSON)
      try {
        const body = await req.json();
        if (body.content) {
          widgetContent = body.content;
          console.log('[Deploy Widget] Received content from JSON body, size:', widgetContent.length, 'bytes');
        } else {
          return new Response(JSON.stringify({ error: 'No content provided. Send file via multipart or content in JSON body.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid request. Send file via multipart form or JSON with content field.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate widget content - basic checks
    if (!widgetContent.includes('NotiProof') || widgetContent.includes('<!DOCTYPE')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid widget content',
        hint: 'The file does not appear to be valid NotiProof widget JavaScript'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate minimum file size (widget should be at least 10KB)
    if (widgetContent.length < 10000) {
      return new Response(JSON.stringify({ 
        error: 'Widget file too small',
        hint: `Expected at least 10KB, got ${(widgetContent.length / 1024).toFixed(1)}KB. This may indicate corrupted or incomplete content.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate JavaScript syntax before deploying
    console.log('[Deploy Widget] Validating JavaScript syntax...');
    try {
      // Use Function constructor to check syntax (doesn't execute the code)
      new Function(widgetContent);
      console.log('[Deploy Widget] Syntax validation passed');
    } catch (syntaxError) {
      console.error('[Deploy Widget] Syntax validation FAILED:', syntaxError);
      return new Response(JSON.stringify({ 
        error: 'Widget has JavaScript syntax errors',
        hint: syntaxError instanceof Error ? syntaxError.message : 'Unknown syntax error',
        details: 'The widget file failed syntax validation and was NOT deployed to prevent breaking customer sites.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate const declarations that would crash at runtime
    const duplicateConstMatch = widgetContent.match(/const\s+(script|siteToken|widgetId)\s*=/g);
    if (duplicateConstMatch && duplicateConstMatch.length > 1) {
      const duplicates = duplicateConstMatch.filter((v, i, a) => a.indexOf(v) !== i);
      if (duplicates.length > 0) {
        console.error('[Deploy Widget] Duplicate const declarations detected:', duplicates);
        return new Response(JSON.stringify({ 
          error: 'Widget has duplicate variable declarations',
          hint: `Found duplicate declarations: ${duplicates.join(', ')}. This would crash the widget.`,
          details: 'Fix the duplicate declarations in public/widget.js before deploying.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Upload to Supabase Storage (primary source)
    console.log('[Deploy Widget] Uploading to Supabase Storage...');
    const widgetBlob = new Blob([widgetContent], { type: 'application/javascript' });
    
    const { error: uploadError } = await supabase.storage
      .from('widget-assets')
      .upload('widget.js', widgetBlob, {
        cacheControl: '300',
        upsert: true,
        contentType: 'application/javascript',
      });

    if (uploadError) {
      console.error('[Deploy Widget] Storage upload failed:', uploadError);
      return new Response(JSON.stringify({ 
        error: 'Storage upload failed',
        details: uploadError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storageUrl = `${supabaseUrl}/storage/v1/object/public/widget-assets/widget.js`;
    console.log('[Deploy Widget] Successfully uploaded to Storage:', storageUrl);

    // Also try to upload to Bunny CDN if configured
    let cdnUrl: string | undefined;
    try {
      const widgetFile = new File([widgetBlob], 'widget.js', { type: 'application/javascript' });
      const formData = new FormData();
      formData.append('file', widgetFile);
      formData.append('path', 'widget.js');
      formData.append('zone', 'assets');
      formData.append('exact_path', 'true');

      console.log('[Deploy Widget] Uploading to Bunny CDN...');
      const uploadResponse = await fetch(
        `${supabaseUrl}/functions/v1/bunny-upload`,
        {
          method: 'POST',
          headers: { 'Authorization': authHeader },
          body: formData,
        }
      );

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        if (uploadResult.success && uploadResult.url) {
          cdnUrl = uploadResult.url;
          console.log('[Deploy Widget] Successfully uploaded to Bunny CDN:', cdnUrl);
        }
      }
    } catch (cdnError) {
      console.warn('[Deploy Widget] Bunny CDN upload failed (non-critical):', cdnError);
    }

    const uploadTime = Date.now() - startTime;

    const result: DeployResult = {
      success: true,
      url: cdnUrl || storageUrl,
      storage_url: storageUrl,
      details: {
        file_size: widgetContent.length,
        upload_time_ms: uploadTime,
        cdn_url: cdnUrl,
        storage_url: storageUrl,
        source: 'admin-upload',
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
