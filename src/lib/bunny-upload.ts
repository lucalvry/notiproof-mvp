import { supabase } from "@/integrations/supabase/client";

export interface BunnyUploadOptions {
  kind?: "media" | "assets";
  folder?: string;
  filename: string;
  contentType: string;
  blob: Blob;
}

/**
 * Uploads a file to Bunny CDN via the bunny-upload-url edge function.
 * Returns the public CDN URL on success. Throws on failure.
 *
 * Falls back to Supabase Storage upload (in `proof-media`) if Bunny is not configured.
 */
export async function uploadToBunny({ kind = "media", folder, filename, contentType, blob }: BunnyUploadOptions): Promise<string> {
  // Ask edge function for an upload URL
  const { data, error } = await supabase.functions.invoke("bunny-upload-url", {
    body: { kind, folder, filename, content_type: contentType },
  });

  if (error || !data?.ok) {
    // Fallback to Supabase Storage if Bunny is not configured
    if (data?.error?.includes("not configured") || error?.message?.includes("not configured")) {
      const path = `${folder ?? "public"}/${Date.now()}_${filename}`;
      const { error: upErr } = await supabase.storage.from("proof-media").upload(path, blob, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("proof-media").getPublicUrl(path);
      return pub.publicUrl;
    }
    throw new Error(error?.message ?? data?.error ?? "Failed to get upload URL");
  }

  const res = await fetch(data.upload_url, {
    method: data.method ?? "PUT",
    headers: data.headers ?? { "Content-Type": contentType },
    body: blob,
  });

  if (!res.ok) {
    throw new Error(`Bunny upload failed: ${res.status} ${res.statusText}`);
  }

  return data.public_url as string;
}

export interface GeneratePosterOptions {
  businessId: string;
  mediaUrl: string;
  proofId?: string;
  authorName?: string | null;
  brandColor?: string | null;
  /** Optional public collection token for unauthenticated callers (testimonial submission flow). */
  collectionToken?: string;
}

/**
 * Asks the generate-video-poster edge function to produce a poster image
 * for a video proof. Best-effort: never throws. Returns the poster URL or null.
 */
export async function generateVideoPoster(opts: GeneratePosterOptions): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (opts.collectionToken) headers["x-collection-token"] = opts.collectionToken;
    const { data, error } = await supabase.functions.invoke("generate-video-poster", {
      body: {
        business_id: opts.businessId,
        media_url: opts.mediaUrl,
        proof_id: opts.proofId,
        author_name: opts.authorName ?? undefined,
        brand_color: opts.brandColor ?? undefined,
      },
      headers,
    });
    if (error || !data?.ok) return null;
    return (data.poster_url as string) ?? null;
  } catch {
    return null;
  }
}
