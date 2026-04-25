// Issues a Bunny CDN Storage upload URL + public CDN URL for a file.
// Clients PUT the file directly to Bunny, then store the returned public URL.
// Two zones supported via `kind`:
//   "media"  -> BUNNY_MEDIA_ZONE / BUNNY_MEDIA_PASSWORD (testimonial videos, avatars, logos)
//   "assets" -> BUNNY_ASSETS_ZONE / BUNNY_ASSETS_PASSWORD (widget.js, public assets)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const BUNNY_CDN_HOSTNAME = Deno.env.get("BUNNY_CDN_HOSTNAME") ?? "";
const BUNNY_MEDIA_ZONE = Deno.env.get("BUNNY_MEDIA_ZONE") ?? "";
const BUNNY_MEDIA_PASSWORD = Deno.env.get("BUNNY_MEDIA_PASSWORD") ?? "";
const BUNNY_ASSETS_ZONE = Deno.env.get("BUNNY_ASSETS_ZONE") ?? "";
const BUNNY_ASSETS_PASSWORD = Deno.env.get("BUNNY_ASSETS_PASSWORD") ?? "";
const BUNNY_STORAGE_ENDPOINT = "https://storage.bunnycdn.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function safeName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    // Auth is optional for public testimonial uploads (token-based), but if present we use it.
    if (authHeader?.startsWith("Bearer ")) {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
      const { data } = await sb.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const kind: "media" | "assets" = body.kind === "assets" ? "assets" : "media";
    const folder = typeof body.folder === "string" ? safeName(body.folder) : (userId ?? "public");
    const filename = typeof body.filename === "string" ? safeName(body.filename) : `${Date.now()}.bin`;
    const contentType = typeof body.content_type === "string" ? body.content_type : "application/octet-stream";

    const zone = kind === "media" ? BUNNY_MEDIA_ZONE : BUNNY_ASSETS_ZONE;
    const password = kind === "media" ? BUNNY_MEDIA_PASSWORD : BUNNY_ASSETS_PASSWORD;
    if (!zone || !password || !BUNNY_CDN_HOSTNAME) {
      return json({ error: "Bunny CDN is not configured" }, 503);
    }

    const path = `${folder}/${Date.now()}_${filename}`;
    const upload_url = `${BUNNY_STORAGE_ENDPOINT}/${zone}/${path}`;
    const public_url = `https://${BUNNY_CDN_HOSTNAME}/${path}`;

    return json({
      ok: true,
      upload_url,
      public_url,
      method: "PUT",
      headers: {
        AccessKey: password,
        "Content-Type": contentType,
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
