import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Free tier defaults (when no subscription exists)
const FREE_TIER_STORAGE_LIMIT = 104857600; // 100MB

interface PresignRequest {
  filename: string;
  path?: string;
  zone?: 'media' | 'assets';
  fileSize: number;
  mimeType: string;
  websiteId?: string;
}

interface PresignResponse {
  success: boolean;
  uploadUrl?: string;
  cdnUrl?: string;
  fullPath?: string;
  expires_at?: string;
  headers?: Record<string, string>;
  error?: string;
  code?: string;
  details?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // ===== Phase 1: Authentication =====
    console.log('🔐 Starting authentication...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user authentication
    let user;
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error('No user found');
      user = authUser;
    } catch (authError) {
      console.error('❌ Auth error:', authError);
      return errorResponse('UNAUTHORIZED', 'Invalid authentication token', 401);
    }

    userId = user.id;
    console.log(`✅ Authenticated user: ${userId}`);

    // ===== Phase 2: Parse Request Body =====
    console.log('📦 Parsing request body...');
    let requestData: PresignRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return errorResponse('INVALID_REQUEST', 'Invalid JSON in request body', 400);
    }

    const { filename, path = '', zone = 'media', fileSize, mimeType, websiteId } = requestData;

    if (!filename || !fileSize || !mimeType) {
      console.error('❌ Missing required fields');
      return errorResponse(
        'INVALID_REQUEST',
        'Missing required fields: filename, fileSize, mimeType',
        400
      );
    }

    console.log(`📄 Presign request: ${filename} (${mimeType}, ${(fileSize / 1024).toFixed(2)}KB) → Zone: ${zone}`);

    // ===== Phase 3: Get User's Plan Limits =====
    console.log('📋 Fetching user plan limits...');
    let subscription;
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          plan:subscription_plans(
            storage_limit_bytes
          )
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      subscription = data;
    } catch (planError) {
      console.error('❌ Failed to fetch plan:', planError);
      return errorResponse('PLAN_NOT_FOUND', 'Could not determine user plan', 500);
    }

    // Use plan limits or free tier defaults
    const planData = subscription?.plan;
    const planLimits = Array.isArray(planData) ? planData[0] : planData;
    const storageLimitBytes = Number(planLimits?.storage_limit_bytes || FREE_TIER_STORAGE_LIMIT);

    console.log(`✅ Plan storage limit: ${(storageLimitBytes / 1024 / 1024).toFixed(2)}MB`);

    // ===== Phase 4: Storage Quota Check =====
    console.log('💾 Checking storage quota...');
    let currentUsage;
    try {
      const { data: currentUsageData, error: storageError } = await supabase
        .rpc('get_user_storage_used', { p_user_id: userId });
      
      if (storageError) throw storageError;
      currentUsage = Number(currentUsageData || 0);
    } catch (storageError) {
      console.error('❌ Failed to check storage usage:', storageError);
      return errorResponse('SERVER_ERROR', 'Could not verify storage quota', 500);
    }

    const newTotalUsage = currentUsage + fileSize;

    console.log(`📊 Storage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB + ${(fileSize / 1024 / 1024).toFixed(2)}MB = ${(newTotalUsage / 1024 / 1024).toFixed(2)}MB / ${(storageLimitBytes / 1024 / 1024).toFixed(2)}MB`);

    if (newTotalUsage > storageLimitBytes) {
      console.error('❌ Storage limit exceeded');
      return errorResponse(
        'STORAGE_LIMIT_EXCEEDED',
        `Storage limit exceeded. Current: ${(currentUsage / 1024 / 1024).toFixed(2)}MB, New file: ${(fileSize / 1024 / 1024).toFixed(2)}MB, Limit: ${(storageLimitBytes / 1024 / 1024).toFixed(2)}MB`,
        400,
        {
          currentUsage,
          fileSize,
          limit: storageLimitBytes,
          available: storageLimitBytes - currentUsage,
        }
      );
    }
    console.log('✅ Storage quota check passed');

    // ===== Phase 5: Generate Presigned URL =====
    console.log('🔑 Generating presigned URL...');
    const BUNNY_MEDIA_ZONE = Deno.env.get('BUNNY_MEDIA_ZONE');
    const BUNNY_MEDIA_PASSWORD = Deno.env.get('BUNNY_MEDIA_PASSWORD');
    const BUNNY_ASSETS_ZONE = Deno.env.get('BUNNY_ASSETS_ZONE');
    const BUNNY_ASSETS_PASSWORD = Deno.env.get('BUNNY_ASSETS_PASSWORD');
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_STORAGE_PASSWORD = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME');

    let storageZone: string;
    let storagePassword: string;

    // Zone-aware configuration
    if (zone === 'assets') {
      storageZone = BUNNY_ASSETS_ZONE || BUNNY_STORAGE_ZONE || '';
      storagePassword = BUNNY_ASSETS_PASSWORD || BUNNY_STORAGE_PASSWORD || '';
      console.log(`📦 Using assets zone: ${storageZone}`);
    } else {
      storageZone = BUNNY_MEDIA_ZONE || BUNNY_STORAGE_ZONE || '';
      storagePassword = BUNNY_MEDIA_PASSWORD || BUNNY_STORAGE_PASSWORD || '';
      console.log(`📦 Using media zone: ${storageZone}`);
    }

    if (!storageZone || !storagePassword || !BUNNY_CDN_HOSTNAME) {
      console.error('❌ Missing Bunny configuration');
      return errorResponse('SERVER_ERROR', 'CDN not configured', 500);
    }

    // Generate unique filename
    const ext = filename.split('.').pop();
    const uniqueFilename = `${crypto.randomUUID()}.${ext}`;
    const fullPath = path ? `${path}/${uniqueFilename}` : uniqueFilename;
    const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${fullPath}`;
    const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/${fullPath}`;

    // Expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    console.log(`✅ Presigned URL generated: ${uploadUrl}`);

    // ===== Phase 6: Log Presign Request =====
    const duration_ms = Date.now() - startTime;
    try {
      await supabase.from('integration_logs').insert({
        integration_type: 'bunny_cdn',
        action: 'presign',
        status: 'success',
        user_id: userId,
        details: {
          filename,
          file_size: fileSize,
          mime_type: mimeType,
          zone,
          full_path: fullPath,
          website_id: websiteId,
          expires_at: expiresAt,
        },
        duration_ms,
      });
      console.log('✅ Presign logged successfully');
    } catch (logError) {
      console.error('⚠️ Failed to log presign (non-fatal):', logError);
    }

    // Return presigned URL response
    const response: PresignResponse = {
      success: true,
      uploadUrl,
      cdnUrl,
      fullPath,
      expires_at: expiresAt,
      headers: {
        'AccessKey': storagePassword,
        'Content-Type': mimeType,
      },
    };

    console.log(`🎉 Presign completed successfully in ${duration_ms}ms`);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Presign error:', error);

    // Log error
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from('integration_logs').insert({
          integration_type: 'bunny_cdn',
          action: 'presign',
          status: 'error',
          user_id: userId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - startTime,
        });
      } catch (logError) {
        console.error('⚠️ Failed to log error:', logError);
      }
    }

    return errorResponse(
      'SERVER_ERROR',
      error instanceof Error ? error.message : 'Presign failed',
      500
    );
  }
});

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, any>
): Response {
  const body: PresignResponse = {
    success: false,
    error: message,
    code,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
