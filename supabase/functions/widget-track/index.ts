// Public endpoint: writes widget_events rows. Also flips
// businesses.install_verified on the first impression.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ALLOWED = new Set(["impression", "interaction", "conversion"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      business_id,
      widget_id,
      proof_object_id = null,
      event_type,
      visitor_id = null,
      page_url = null,
    } = body ?? {};

    if (!business_id || !widget_id || !event_type || !ALLOWED.has(event_type)) {
      return json({ error: "invalid payload" }, 400);
    }

    const { error } = await supabase.from("widget_events").insert({
      business_id,
      widget_id,
      proof_object_id,
      event_type,
      visitor_id,
      page_url,
    });
    if (error) throw error;

    if (event_type === "impression") {
      const { data: biz } = await supabase
        .from("businesses")
        .select("settings, install_verified")
        .eq("id", business_id)
        .maybeSingle();
      const settings = (biz?.settings as Record<string, unknown>) ?? {};
      if (!biz?.install_verified) {
        await supabase
          .from("businesses")
          .update({ install_verified: true, settings: { ...settings, install_verified: true, install_verified_at: new Date().toISOString() } })
          .eq("id", business_id);
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
