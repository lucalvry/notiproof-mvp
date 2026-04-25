// Shopify webhook receiver: verifies HMAC, stores events, creates proof_objects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET");

async function verifyHmac(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (b64.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < b64.length; i++) diff |= b64.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  const raw = await req.text();
  const topic = req.headers.get("x-shopify-topic") ?? "unknown";
  const shopDomain = req.headers.get("x-shopify-shop-domain");
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (SHOPIFY_CLIENT_SECRET) {
    const ok = await verifyHmac(raw, hmac, SHOPIFY_CLIENT_SECRET);
    if (!ok) return new Response(JSON.stringify({ error: "Invalid HMAC" }), { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Resolve integration: by id (preferred) or by shop domain stored in config.
  let integ: { id: string; business_id: string } | null = null;
  if (integrationId) {
    const { data } = await supabase.from("integrations").select("id, business_id, provider").eq("id", integrationId).maybeSingle();
    if (data?.provider === "shopify") integ = { id: data.id, business_id: data.business_id };
  }
  if (!integ && shopDomain) {
    const { data } = await supabase.from("integrations").select("id, business_id, config, provider").eq("provider", "shopify");
    integ = data?.find((d: any) => (d.config?.shop ?? "") === shopDomain) ?? null;
  }
  if (!integ) {
    return new Response(JSON.stringify({ error: "Integration not found" }), { status: 404, headers: corsHeaders });
  }

  const { data: evRow } = await supabase.from("integration_events").insert({
    business_id: integ.business_id,
    integration_id: integ.id,
    event_type: topic,
    payload,
  }).select("id").single();

  let proofId: string | null = null;
  if (topic === "orders/create" || topic === "orders/paid") {
    const total = payload.total_price ? `${payload.total_price} ${payload.currency ?? "USD"}` : "an order";
    const customer = payload.customer ?? {};
    const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null;
    const { data: po } = await supabase.from("proof_objects").insert({
      business_id: integ.business_id,
      type: "purchase",
      status: "approved",
      verified: true,
      author_name: fullName,
      author_email: customer.email ?? payload.email ?? null,
      content: `Ordered ${total}`,
      source: "shopify",
      source_metadata: { topic, order_id: payload.id },
      published_at: new Date().toISOString(),
    }).select("id").single();
    proofId = po?.id ?? null;
  }

  if (evRow?.id) {
    await supabase.from("integration_events").update({
      processed_at: new Date().toISOString(),
      proof_object_id: proofId,
    }).eq("id", evRow.id);
  }

  await supabase.from("integrations").update({
    status: "connected",
    last_sync_at: new Date().toISOString(),
  }).eq("id", integ.id);

  return new Response(JSON.stringify({ received: true, proof_object_id: proofId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
