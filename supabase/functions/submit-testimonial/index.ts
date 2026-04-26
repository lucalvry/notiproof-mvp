// Public endpoint: validates the collection token, creates a pending
// proof_object, and marks the testimonial_request as completed.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      token, author_name, author_email, content, rating, media_url,
      author_role, author_company, author_photo_url, author_website_url,
      media_size_bytes, media_duration_seconds,
    } = body ?? {};

    // Basic input validation
    if (!token || typeof token !== "string" || token.length < 8 || token.length > 128) {
      return json({ error: "invalid token" }, 400);
    }
    if (!author_name || typeof author_name !== "string" || author_name.length > 200) {
      return json({ error: "name required" }, 400);
    }
    if (!author_email || typeof author_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author_email)) {
      return json({ error: "valid email required" }, 400);
    }
    if (!content || typeof content !== "string" || content.trim().length < 10 || content.length > 5000) {
      return json({ error: "testimonial must be 10–5000 characters" }, 400);
    }
    const ratingNum = rating == null ? null : Number(rating);
    if (ratingNum != null && (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
      return json({ error: "rating must be 1–5" }, 400);
    }
    if (media_url && (typeof media_url !== "string" || media_url.length > 2000)) {
      return json({ error: "invalid media_url" }, 400);
    }
    const optStr = (v: unknown, max = 200) =>
      typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : null;
    const optUrl = (v: unknown) => {
      if (typeof v !== "string" || v.length === 0 || v.length > 2000) return null;
      if (!/^https?:\/\//i.test(v)) return null;
      return v;
    };

    // Resolve the business this token belongs to and enforce the monthly proof
    // limit BEFORE we let the RPC create a new proof_object. Returning 429 lets
    // the client show a friendly "creator is over their plan" message instead
    // of a generic 500.
    let resolvedBusinessId: string | null = null;
    {
      const { data: req } = await supabase
        .from("testimonial_requests")
        .select("business_id, expires_at, status")
        .eq("token", token)
        .maybeSingle();
      if (req?.business_id) {
        resolvedBusinessId = req.business_id;
        const { data: allowed } = await supabase.rpc("can_create_proof", { _business_id: req.business_id });
        if (allowed === false) {
          return json({ error: "This business has reached its monthly testimonial limit. Please try again next month or contact them directly." }, 429);
        }
        // Enforce per-plan max video duration server-side.
        if (media_url && typeof media_duration_seconds === "number" && media_duration_seconds > 0) {
          const { data: biz } = await supabase.from("businesses").select("plan").eq("id", req.business_id).maybeSingle();
          if (biz?.plan) {
            const { data: limits } = await supabase.rpc("plan_limits", { _plan: biz.plan });
            const maxSec = (limits as any)?.[0]?.max_video_seconds ?? 30;
            if (media_duration_seconds > maxSec + 1) {
              return json({ error: `Video too long. Maximum ${maxSec} seconds on this plan.` }, 400);
            }
          }
        }
      }
    }

    const { data, error } = await supabase.rpc("submit_testimonial_request", {
      _token: token,
      _author_name: author_name,
      _author_email: author_email,
      _content: content,
      _rating: ratingNum,
      _media_url: media_url ?? null,
      _author_role: optStr(author_role),
      _author_company: optStr(author_company),
      _author_photo_url: optUrl(author_photo_url),
      _author_website_url: optUrl(author_website_url),
    });
    if (error) throw error;

    // Return the proof's business_id so the client can request a poster image.
    let business_id: string | null = resolvedBusinessId;
    if (data) {
      if (!business_id) {
        const { data: proof } = await supabase
          .from("proof_objects")
          .select("business_id")
          .eq("id", data)
          .maybeSingle();
        business_id = proof?.business_id ?? null;
      }
      // Persist media metadata for storage accounting + retention. Best-effort.
      if (media_url && (typeof media_size_bytes === "number" || typeof media_duration_seconds === "number")) {
        await supabase.rpc("update_proof_media_metadata", {
          _proof_id: data,
          _bytes: typeof media_size_bytes === "number" ? Math.floor(media_size_bytes) : null,
          _duration_seconds: typeof media_duration_seconds === "number" ? media_duration_seconds : null,
        });
      }
    }

    return json({ ok: true, proof_object_id: data, business_id });
  } catch (e) {
    const msg = (e as Error).message ?? "unknown error";
    const status = /invalid|expired|at least|between/i.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
