// Initiates Shopify OAuth: returns the install URL for a given shop domain.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID");
const SCOPES = "read_orders,read_products,read_customers";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  if (!SHOPIFY_CLIENT_ID) {
    return new Response(JSON.stringify({ error: "Shopify not configured" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  let body: { shop?: string; integration_id?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }
  const shop = (body.shop ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) {
    return new Response(JSON.stringify({ error: "Invalid shop domain. Use {your-store}.myshopify.com" }), { status: 400, headers: corsHeaders });
  }
  if (!body.integration_id) {
    return new Response(JSON.stringify({ error: "Missing integration_id" }), { status: 400, headers: corsHeaders });
  }

  // State carries integration_id so the callback can finalize the row.
  const state = btoa(JSON.stringify({ integration_id: body.integration_id, shop }));
  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-shopify-callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  return new Response(JSON.stringify({ install_url: installUrl }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
