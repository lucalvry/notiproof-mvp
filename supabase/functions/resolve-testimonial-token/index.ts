// Public endpoint: returns the business name + branding for a testimonial
// collection token, so the /collect/:token page can render properly.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    let token = url.searchParams.get("token");
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }
    if (!token || typeof token !== "string" || token.length < 8 || token.length > 128) {
      return json({ error: "invalid token" }, 400);
    }

    const { data, error } = await supabase.rpc("get_collection_context", { _token: token });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return json({ error: "not_found" }, 404);

    const expired = new Date(row.expires_at).getTime() < Date.now();
    return json({
      ok: true,
      recipient_name: row.recipient_name,
      business_name: row.business_name,
      business_logo_url: row.business_logo_url,
      brand_color: row.brand_color,
      status: row.status,
      expired,
      already_completed: row.status === "completed",
    });
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
