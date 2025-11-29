import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File type constraints - comprehensive validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB (fixed limit regardless of plan)

// Free tier defaults (when no subscription exists)
const FREE_TIER_STORAGE_LIMIT = 104857600; // 100MB
const FREE_TIER_VIDEO_DURATION = 30; // 30 seconds

interface PlanLimits {
  storage_limit_bytes: any;
  video_max_duration_seconds: number | null;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;
  let websiteId: string | null = null;

  try {
    // ===== Phase 1: Authentication & Plan Lookup =====
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

    // ===== Phase 2: Rate Limiting =====
    console.log('⏱️ Checking rate limits...');
    let rateLimitResult;
    try {
      rateLimitResult = await checkRateLimit(`upload:${userId}`, {
        max_requests: 10,
        window_seconds: 60,
      });
    } catch (rateLimitError) {
      console.error('❌ Rate limit check failed:', rateLimitError);
      return errorResponse('SERVER_ERROR', 'Rate limit check failed', 500);
    }

    if (!rateLimitResult.allowed) {
      console.warn(`⚠️ Rate limit exceeded for user ${userId}`);
      return errorResponse(
        'RATE_LIMIT',
        'Too many uploads. Please try again later.',
        429,
        { reset: rateLimitResult.reset, remaining: 0 }
      );
    }
    console.log(`✅ Rate limit passed (${rateLimitResult.remaining} remaining)`);

    // Get user's plan limits
    console.log('📋 Fetching user plan limits...');
    let subscription;
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          plan:subscription_plans(
            storage_limit_bytes,
            video_max_duration_seconds
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
    const videoDurationLimit = planLimits?.video_max_duration_seconds || FREE_TIER_VIDEO_DURATION;

    console.log(`✅ Plan limits: ${(storageLimitBytes / 1024 / 1024).toFixed(2)}MB storage, ${videoDurationLimit}s video`);

    // ===== Phase 3: Parse Form Data =====
    console.log('📦 Parsing form data...');
    let formData, file, path, zone, durationStr, websiteIdParam;
    try {
      formData = await req.formData();
      file = formData.get('file') as File;
      path = (formData.get('path') as string) || '';
      zone = (formData.get('zone') as string) || 'media';
      durationStr = formData.get('duration') as string | null;
      websiteIdParam = formData.get('website_id') as string | null;
      
      if (websiteIdParam) {
        websiteId = websiteIdParam;
      }

      if (!file) {
        console.error('❌ No file in form data');
        return errorResponse('INVALID_REQUEST', 'No file provided', 400);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse form data:', parseError);
      return errorResponse('INVALID_REQUEST', 'Invalid form data', 400);
    }

    const fileSize = file.size;
    const mimeType = file.type;
    const originalFilename = file.name;

    console.log(`📄 File received: ${originalFilename} (${mimeType}, ${(fileSize / 1024).toFixed(2)}KB) → Zone: ${zone}`);

    // ===== Phase 4: File Type Validation =====
    console.log('🔍 Validating file type...');
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      console.error(`❌ Invalid file type: ${mimeType}`);
      return errorResponse(
        'INVALID_FILE_TYPE',
        `File type ${mimeType} not allowed. Supported: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`,
        400
      );
    }
    console.log(`✅ File type validated: ${isVideo ? 'video' : 'image'}`);

    // Avatar size check (2MB limit regardless of plan)
    if (path.includes('avatar') && fileSize > AVATAR_MAX_SIZE) {
      console.error(`❌ Avatar too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      return errorResponse(
        'AVATAR_TOO_LARGE',
        `Avatar size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds 2MB limit`,
        400,
        { size: fileSize, limit: AVATAR_MAX_SIZE }
      );
    }

    // ===== Phase 5: Video Duration Validation =====
    let duration: number | null = null;
    if (isVideo) {
      console.log('🎥 Validating video duration...');
      if (!durationStr) {
        console.error('❌ No duration parameter provided for video');
        return errorResponse(
          'INVALID_REQUEST',
          'Video duration parameter required',
          400
        );
      }

      duration = parseInt(durationStr, 10);
      if (isNaN(duration) || duration <= 0) {
        console.error(`❌ Invalid duration value: ${durationStr}`);
        return errorResponse(
          'INVALID_REQUEST',
          'Invalid video duration value',
          400
        );
      }

      if (duration > videoDurationLimit) {
        console.error(`❌ Video duration ${duration}s exceeds limit ${videoDurationLimit}s`);
        return errorResponse(
          'VIDEO_DURATION_LIMIT',
          `Video duration ${duration}s exceeds plan limit of ${videoDurationLimit}s`,
          400,
          { duration, limit: videoDurationLimit }
        );
      }
      console.log(`✅ Video duration validated: ${duration}s`);
    }

    // ===== Phase 6: Storage Quota Check =====
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

    // ===== Phase 7: Bunny CDN Upload =====
    console.log('☁️ Preparing Bunny CDN upload...');
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

    const ext = originalFilename.split('.').pop();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const fullPath = path ? `${path}/${filename}` : filename;
    const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${fullPath}`;

    console.log(`🚀 Uploading to Bunny: ${uploadUrl}`);

    let uploadResponse;
    try {
      uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': storagePassword,
          'Content-Type': mimeType,
        },
        body: await file.arrayBuffer(),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`❌ Bunny upload failed: ${uploadResponse.status} - ${errorText}`);
        throw new Error(`Bunny upload failed: ${uploadResponse.status}`);
      }
    } catch (uploadError) {
      console.error('❌ Upload exception:', uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      throw new Error(`Upload failed: ${errorMessage}`);
    }

    const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/${fullPath}`;
    console.log(`✅ Upload successful: ${cdnUrl}`);

    // ===== Phase 8: Media Tracking =====
    console.log('📝 Tracking media in database...');
    const mediaType = isVideo ? 'video' : path.includes('avatar') ? 'avatar' : 'testimonial-image';

    try {
      const { error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: userId,
          website_id: websiteId,
          type: mediaType,
          file_size: fileSize,
          duration_seconds: duration,
          cdn_url: cdnUrl,
          original_filename: originalFilename,
          mime_type: mimeType,
        });

      if (mediaError) {
        console.error('⚠️ Media tracking error (non-fatal):', mediaError);
        // Log but don't fail the upload
      } else {
        console.log('✅ Media tracked successfully');
      }
    } catch (trackError) {
      console.error('⚠️ Media tracking exception (non-fatal):', trackError);
    }

    // ===== Phase 9: Comprehensive Logging =====
    console.log('📊 Logging upload details...');
    const duration_ms = Date.now() - startTime;
    
    let newUsageBytes = currentUsage + fileSize;
    try {
      const { data: updatedUsage } = await supabase.rpc('get_user_storage_used', { p_user_id: userId });
      newUsageBytes = Number(updatedUsage || newUsageBytes);
    } catch (usageError) {
      console.warn('⚠️ Could not refresh storage usage:', usageError);
    }

    try {
      await supabase.from('integration_logs').insert({
        integration_type: 'bunny_cdn',
        action: 'upload',
        status: 'success',
        user_id: userId,
        details: {
          file_size: fileSize,
          mime_type: mimeType,
          type: mediaType,
          duration_seconds: duration,
          storage_usage_bytes: newUsageBytes,
          storage_limit_bytes: storageLimitBytes,
          cdn_url: cdnUrl,
          website_id: websiteId,
          zone,
        },
        duration_ms,
      });
      console.log('✅ Upload logged successfully');
    } catch (logError) {
      console.error('⚠️ Failed to log upload (non-fatal):', logError);
    }

    console.log(`🎉 Upload completed successfully in ${duration_ms}ms`);
    return new Response(
      JSON.stringify({
        success: true,
        url: cdnUrl,
        path: fullPath,
        storageUsed: newUsageBytes,
        storageLimit: storageLimitBytes,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Upload error:', error);

    // Log error
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from('integration_logs').insert({
          integration_type: 'bunny_cdn',
          action: 'upload',
          status: 'error',
          user_id: userId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - startTime,
          details: { website_id: websiteId },
        });
      } catch (logError) {
        console.error('⚠️ Failed to log error:', logError);
      }
    }

    return errorResponse(
      'SERVER_ERROR',
      error instanceof Error ? error.message : 'Upload failed',
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
  const body: ErrorResponse = {
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
