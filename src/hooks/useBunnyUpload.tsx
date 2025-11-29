import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BunnyUploadResponse {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  code?: string;
  storageUsed?: number;
  storageLimit?: number;
  details?: Record<string, any>;
}

export interface BunnyUploadOptions {
  path?: string;
  zone?: 'media' | 'assets';
  duration?: number; // Video duration in seconds
  websiteId?: string;
  usePresignedUrl?: boolean; // Default true for direct browser uploads
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
}

export function useBunnyUpload() {
  /**
   * Upload directly to Bunny CDN using presigned URL (browser → Bunny)
   * Falls back to proxy upload if presigned fails
   */
  const uploadToBunny = async (
    file: File, 
    options?: BunnyUploadOptions | string,
  ): Promise<BunnyUploadResponse> => {
    // Handle legacy API: uploadToBunny(file, path, zone)
    const opts: BunnyUploadOptions = typeof options === 'string' 
      ? { path: options } 
      : options || {};
    
    const usePresigned = opts.usePresignedUrl !== false; // Default to true
    
    try {
      // Step 1: Try presigned URL flow (direct browser → Bunny)
      if (usePresigned) {
        const presignResult = await uploadWithPresignedUrl(file, opts);
        if (presignResult.success) {
          return presignResult;
        }
        console.warn('Presigned upload failed, falling back to proxy:', presignResult.error);
      }
      
      // Step 2: Fallback to proxy upload (browser → Edge Function → Bunny)
      return await uploadViaProxy(file, opts);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      console.error('Bunny upload exception:', error);
      toast.error(message);
      return { success: false, error: message };
    }
  };

  /**
   * Direct upload using presigned URL
   */
  const uploadWithPresignedUrl = async (
    file: File,
    opts: BunnyUploadOptions
  ): Promise<BunnyUploadResponse> => {
    console.log('📤 Attempting presigned URL upload...');
    
    // Get presigned URL from edge function
    const { data: presignData, error: presignError } = await supabase.functions.invoke('bunny-presign', {
      body: JSON.stringify({
        filename: file.name,
        path: opts.path,
        zone: opts.zone || 'media',
        fileSize: file.size,
        mimeType: file.type,
        websiteId: opts.websiteId,
      }),
    });

    if (presignError || !presignData?.success) {
      const errorMsg = presignError?.message || presignData?.error || 'Failed to get presigned URL';
      console.error('Presign error:', errorMsg);
      return { success: false, error: errorMsg, code: presignData?.code };
    }

    const { uploadUrl, cdnUrl, fullPath, headers } = presignData as PresignResponse;

    if (!uploadUrl || !headers) {
      return { success: false, error: 'Invalid presign response' };
    }

    console.log('📤 Uploading directly to Bunny CDN:', uploadUrl);

    // Upload directly to Bunny Storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Direct upload failed:', uploadResponse.status, errorText);
      return { 
        success: false, 
        error: `Direct upload failed: ${uploadResponse.status}`,
        code: 'DIRECT_UPLOAD_FAILED'
      };
    }

    console.log('✅ Direct upload successful:', cdnUrl);
    
    // Track media in database via separate call
    await trackMediaUpload(file, cdnUrl!, fullPath!, opts);

    toast.success('File uploaded successfully');
    return {
      success: true,
      url: cdnUrl,
      path: fullPath,
    };
  };

  /**
   * Proxy upload via edge function (fallback)
   */
  const uploadViaProxy = async (
    file: File,
    opts: BunnyUploadOptions
  ): Promise<BunnyUploadResponse> => {
    console.log('📤 Using proxy upload via edge function...');
    
    const formData = new FormData();
    formData.append('file', file);
    if (opts.path) formData.append('path', opts.path);
    if (opts.zone) formData.append('zone', opts.zone);
    if (opts.duration) formData.append('duration', opts.duration.toString());
    if (opts.websiteId) formData.append('website_id', opts.websiteId);
    
    const { data, error } = await supabase.functions.invoke('bunny-upload', {
      body: formData,
    });
    
    if (error) {
      console.error('Bunny upload error:', error);
      const errorMsg = error.message || 'Upload failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!data?.success) {
      const errorMsg = data?.error || 'Unknown error';
      const errorCode = data?.code;
      
      // User-friendly error messages
      if (errorCode === 'STORAGE_LIMIT_EXCEEDED') {
        toast.error('Storage limit exceeded. Please upgrade your plan or delete some files.');
      } else if (errorCode === 'VIDEO_DURATION_LIMIT') {
        toast.error(`Video too long. Your plan allows up to ${data?.details?.limit}s videos.`);
      } else if (errorCode === 'AVATAR_TOO_LARGE') {
        toast.error('Avatar must be under 2MB');
      } else if (errorCode === 'RATE_LIMIT') {
        toast.error('Too many uploads. Please wait a moment.');
      } else {
        toast.error(errorMsg);
      }
      
      return { 
        success: false, 
        error: errorMsg,
        code: errorCode,
        details: data?.details 
      };
    }
    
    toast.success('File uploaded successfully');
    return data;
  };

  /**
   * Track uploaded media in database
   */
  const trackMediaUpload = async (
    file: File,
    cdnUrl: string,
    fullPath: string,
    opts: BunnyUploadOptions
  ): Promise<void> => {
    try {
      const isVideo = file.type.startsWith('video/');
      const isAvatar = opts.path?.includes('avatar');
      const mediaType = isVideo ? 'video' : isAvatar ? 'avatar' : 'testimonial-image';

      const { error } = await supabase.from('media').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        website_id: opts.websiteId || null,
        type: mediaType,
        file_size: file.size,
        duration_seconds: opts.duration || null,
        cdn_url: cdnUrl,
        original_filename: file.name,
        mime_type: file.type,
      });

      if (error) {
        console.warn('Media tracking failed (non-fatal):', error);
      }
    } catch (err) {
      console.warn('Media tracking exception (non-fatal):', err);
    }
  };

  /**
   * Extract thumbnail from video file
   */
  const extractVideoThumbnail = async (
    videoFile: File,
    seekTime: number = 1
  ): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(video.src);
        video.remove();
        canvas.remove();
      };

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(seekTime, video.duration * 0.1);
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve(blob);
            },
            'image/jpeg',
            0.8
          );
        } else {
          cleanup();
          resolve(null);
        }
      };

      video.onerror = () => {
        console.error('Video thumbnail extraction failed');
        cleanup();
        resolve(null);
      };

      // Set timeout for thumbnail extraction
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 10000);

      video.src = URL.createObjectURL(videoFile);
    });
  };

  /**
   * Upload video with automatic thumbnail extraction
   */
  const uploadVideoWithThumbnail = async (
    videoFile: File,
    opts: BunnyUploadOptions
  ): Promise<{ video: BunnyUploadResponse; thumbnail?: BunnyUploadResponse }> => {
    // Upload video
    const videoResult = await uploadToBunny(videoFile, opts);
    
    if (!videoResult.success) {
      return { video: videoResult };
    }

    // Extract and upload thumbnail
    try {
      const thumbnailBlob = await extractVideoThumbnail(videoFile);
      
      if (thumbnailBlob) {
        const thumbnailFile = new File(
          [thumbnailBlob], 
          videoFile.name.replace(/\.[^/.]+$/, '_thumb.jpg'),
          { type: 'image/jpeg' }
        );

        const thumbnailOpts: BunnyUploadOptions = {
          ...opts,
          path: opts.path?.replace('videos', 'thumbnails') || 'thumbnails',
        };

        const thumbnailResult = await uploadToBunny(thumbnailFile, thumbnailOpts);
        
        return { video: videoResult, thumbnail: thumbnailResult };
      }
    } catch (err) {
      console.warn('Thumbnail extraction failed (non-fatal):', err);
    }

    return { video: videoResult };
  };

  return { 
    uploadToBunny, 
    extractVideoThumbnail,
    uploadVideoWithThumbnail,
    uploadWithPresignedUrl,
    uploadViaProxy,
  };
}
