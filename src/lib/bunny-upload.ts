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
