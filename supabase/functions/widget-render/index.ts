// Public endpoint: returns widget config + recent approved proofs for a business.
// No auth required. Reads-only. Used by /widget.js at runtime.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const businessId = url.searchParams.get("business");
    const widgetId = url.searchParams.get("widget");
    if (!businessId) {
      return json({ error: "business param required" }, 400);
    }

    // Pick widget: explicit id, else first active widget for business.
    let widgetQ = supabase.from("widgets").select("id, name, type, status, config")
      .eq("business_id", businessId);
    widgetQ = widgetId ? widgetQ.eq("id", widgetId) : widgetQ.eq("status", "active");
    const { data: widgets, error: wErr } = await widgetQ.limit(1);
    if (wErr) throw wErr;
    const widget = widgets?.[0] ?? null;

    const { data: bizRow } = await supabase
      .from("businesses")
      .select("name, website_url")
      .eq("id", businessId)
      .maybeSingle();
    const business = bizRow
      ? { name: bizRow.name, website_url: bizRow.website_url }
      : null;

    const { data: proofs, error: pErr } = await supabase
      .from("proof_objects")
      .select(
        "id, type, content, author_name, author_avatar_url, author_photo_url, author_role, author_company, author_company_logo_url, author_website_url, cta_label, cta_url, rating, media_url, poster_url, source, created_at",
      )
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (pErr) throw pErr;

    return json({ widget, business, proofs: proofs ?? [] });
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
