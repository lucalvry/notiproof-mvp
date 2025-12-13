import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File type constraints for public uploads
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Free tier defaults
const FREE_TIER_VIDEO_DURATION = 30; // 30 seconds

// In-memory rate limiting (per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 uploads per minute per IP

function checkRateLimitByIP(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let websiteId: string | null = null;
  let ownerId: string | null = null;

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log('🌐 Public upload request from IP:', clientIP);

    // ===== Phase 1: Rate Limiting (IP-based) =====
    const rateCheck = checkRateLimitByIP(clientIP);
    if (!rateCheck.allowed) {
      console.warn(`⚠️ Rate limit exceeded for IP ${clientIP}`);
      return errorResponse(
        'RATE_LIMIT',
        'Too many uploads. Please try again later.',
        429,
        { remaining: 0 }
      );
    }
    console.log(`✅ Rate limit passed (${rateCheck.remaining} remaining)`);

    // ===== Phase 2: Parse Form Data =====
    console.log('📦 Parsing form data...');
    let formData, file, websiteIdParam, fileType, durationStr;
    try {
      formData = await req.formData();
      file = formData.get('file') as File;
      websiteIdParam = formData.get('website_id') as string | null;
      fileType = formData.get('type') as string | null; // 'avatar' or 'video'
      durationStr = formData.get('duration') as string | null;

      if (!file) {
        console.error('❌ No file in form data');
        return errorResponse('INVALID_REQUEST', 'No file provided', 400);
      }

      if (!websiteIdParam) {
        console.error('❌ No website_id provided');
        return errorResponse('INVALID_REQUEST', 'Website ID is required', 400);
      }

      websiteId = websiteIdParam;
    } catch (parseError) {
      console.error('❌ Failed to parse form data:', parseError);
      return errorResponse('INVALID_REQUEST', 'Invalid form data', 400);
    }

    const fileSize = file.size;
    const mimeType = file.type;
    const originalFilename = file.name;

    console.log(`📄 File received: ${originalFilename} (${mimeType}, ${(fileSize / 1024).toFixed(2)}KB)`);

    // ===== Phase 3: Validate Website =====
    console.log('🔍 Validating website...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, user_id, is_verified, deleted_at')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      console.error('❌ Website not found:', websiteError);
      return errorResponse('INVALID_WEBSITE', 'Website not found', 404);
    }

    if (website.deleted_at) {
      console.error('❌ Website is deleted');
      return errorResponse('INVALID_WEBSITE', 'Website is not available', 404);
    }

    if (!website.is_verified) {
      console.error('❌ Website is not verified');
      return errorResponse('INVALID_WEBSITE', 'Website is not verified', 403);
    }

    ownerId = website.user_id;
    console.log(`✅ Website validated, owner: ${ownerId}`);

    // ===== Phase 4: Get Owner's Plan Limits =====
    console.log('📋 Fetching owner plan limits...');
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select(`
        plan:subscription_plans(
          storage_limit_bytes,
          video_max_duration_seconds
        )
      `)
      .eq('user_id', ownerId)
      .in('status', ['active', 'trialing'])
      .single();

    const planData = subscription?.plan;
    const planLimits = Array.isArray(planData) ? planData[0] : planData;
    const videoDurationLimit = planLimits?.video_max_duration_seconds || FREE_TIER_VIDEO_DURATION;

    console.log(`✅ Plan limits: ${videoDurationLimit}s video duration`);

    // ===== Phase 5: File Type Validation =====
    console.log('🔍 Validating file type...');
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      console.error(`❌ Invalid file type: ${mimeType}`);
      return errorResponse(
        'INVALID_FILE_TYPE',
        `File type ${mimeType} not allowed. Supported images: ${ALLOWED_IMAGE_TYPES.join(', ')}. Supported videos: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
        400
      );
    }

    // Size validation
    if (isImage && fileSize > AVATAR_MAX_SIZE) {
      console.error(`❌ Image too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      return errorResponse(
        'FILE_TOO_LARGE',
        `Image size exceeds 2MB limit`,
        400,
        { size: fileSize, limit: AVATAR_MAX_SIZE }
      );
    }

    if (isVideo && fileSize > VIDEO_MAX_SIZE) {
      console.error(`❌ Video too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      return errorResponse(
        'FILE_TOO_LARGE',
        `Video size exceeds 50MB limit`,
        400,
        { size: fileSize, limit: VIDEO_MAX_SIZE }
      );
    }

    console.log(`✅ File type validated: ${isVideo ? 'video' : 'image'}`);

    // ===== Phase 6: Video Duration Validation =====
    let duration: number | null = null;
    if (isVideo) {
      console.log('🎥 Validating video duration...');
      if (durationStr) {
        duration = parseInt(durationStr, 10);
        if (!isNaN(duration) && duration > 0 && duration > videoDurationLimit) {
          console.error(`❌ Video duration ${duration}s exceeds limit ${videoDurationLimit}s`);
          return errorResponse(
            'VIDEO_DURATION_LIMIT',
            `Video duration ${duration}s exceeds plan limit of ${videoDurationLimit}s`,
            400,
            { duration, limit: videoDurationLimit }
          );
        }
      }
      console.log(`✅ Video duration validated: ${duration || 'unknown'}s`);
    }

    // ===== Phase 7: Upload to Bunny CDN =====
    console.log('☁️ Preparing Bunny CDN upload...');
    const BUNNY_MEDIA_ZONE = Deno.env.get('BUNNY_MEDIA_ZONE');
    const BUNNY_MEDIA_PASSWORD = Deno.env.get('BUNNY_MEDIA_PASSWORD');
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_STORAGE_PASSWORD = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME');

    const storageZone = BUNNY_MEDIA_ZONE || BUNNY_STORAGE_ZONE || '';
    const storagePassword = BUNNY_MEDIA_PASSWORD || BUNNY_STORAGE_PASSWORD || '';

    if (!storageZone || !storagePassword || !BUNNY_CDN_HOSTNAME) {
      console.error('❌ Missing Bunny configuration');
      return errorResponse('SERVER_ERROR', 'CDN not configured', 500);
    }

    // Generate unique filename and path
    const ext = originalFilename.split('.').pop();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadType = fileType || (isVideo ? 'video' : 'avatar');
    const path = uploadType === 'video' 
      ? `testimonial-videos/${websiteId}/${filename}`
      : `testimonial-avatars/${websiteId}/${filename}`;
    
    const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${path}`;

    console.log(`🚀 Uploading to Bunny: ${uploadUrl}`);

    const uploadResponse = await fetch(uploadUrl, {
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
      return errorResponse('UPLOAD_FAILED', 'Failed to upload file', 500);
    }

    const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/${path}`;
    console.log(`✅ Upload successful: ${cdnUrl}`);

    // ===== Phase 8: Track Media in Database =====
    console.log('📝 Tracking media in database...');
    const mediaType = isVideo ? 'video' : 'avatar';

    try {
      const { error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: ownerId, // Track against website owner
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
      } else {
        console.log('✅ Media tracked successfully');
      }
    } catch (trackError) {
      console.error('⚠️ Media tracking exception (non-fatal):', trackError);
    }

    // ===== Phase 9: Log Upload =====
    console.log('📊 Logging upload...');
    const durationMs = Date.now() - startTime;

    try {
      await supabase.from('integration_logs').insert({
        integration_type: 'bunny_cdn_public',
        action: 'upload',
        status: 'success',
        user_id: ownerId,
        details: {
          file_size: fileSize,
          mime_type: mimeType,
          type: mediaType,
          duration_seconds: duration,
          cdn_url: cdnUrl,
          website_id: websiteId,
          client_ip: clientIP,
        },
        duration_ms: durationMs,
      });
    } catch (logError) {
      console.error('⚠️ Failed to log upload (non-fatal):', logError);
    }

    console.log(`🎉 Public upload completed in ${durationMs}ms`);
    return new Response(
      JSON.stringify({
        success: true,
        url: cdnUrl,
        path,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Public upload error:', error);

    // Log error
    if (websiteId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from('integration_logs').insert({
          integration_type: 'bunny_cdn_public',
          action: 'upload',
          status: 'error',
          user_id: ownerId,
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
