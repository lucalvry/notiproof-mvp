// Public endpoint: validates the collection token, creates a pending
// proof_object, and marks the testimonial_request as completed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { token, author_name, author_email, content, rating, media_url } = body ?? {};

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

    const { data, error } = await supabase.rpc("submit_testimonial_request", {
      _token: token,
      _author_name: author_name,
      _author_email: author_email,
      _content: content,
      _rating: ratingNum,
      _media_url: media_url ?? null,
    });
    if (error) throw error;

    return json({ ok: true, proof_object_id: data });
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
