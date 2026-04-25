// WooCommerce webhook receiver: verifies HMAC-SHA256 signature against the
// per-integration webhook_secret, stores the event, and creates a proof_object
// for order events.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-topic, x-wc-webhook-source, x-wc-webhook-event, x-wc-webhook-resource, x-wc-webhook-id, x-wc-webhook-delivery-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifyHmac(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  if (!integrationId) return json({ error: "Missing integration_id" }, 400);

  const raw = await req.text();
  const signature = req.headers.get("x-wc-webhook-signature");
  // Topic looks like "order.created", "order.updated", etc.
  const topic = req.headers.get("x-wc-webhook-topic") ?? "unknown";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: integ } = await supabase
    .from("integrations")
    .select("id, business_id, platform, webhook_secret, status")
    .eq("id", integrationId)
    .maybeSingle();

  if (!integ || integ.platform !== "woocommerce") {
    return json({ error: "Integration not found" }, 404);
  }

  // Webhook ping (when WC saves the webhook it sends an empty body to validate).
  if (!raw || raw === "{}") {
    return json({ received: true, ping: true });
  }

  if (!integ.webhook_secret) {
    return json({ error: "Webhook secret not configured" }, 500);
  }

  const ok = await verifyHmac(raw, signature, integ.webhook_secret);
  if (!ok) return json({ error: "Invalid signature" }, 401);

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Insert the raw event record.
  const { data: evRow } = await supabase
    .from("integration_events")
    .insert({
      integration_id: integ.id,
      event_type: topic,
      payload,
    })
    .select("id")
    .single();

  // For order events, create a proof_object.
  let proofId: string | null = null;
  if (topic.startsWith("order.")) {
    const orderId = String(payload.id ?? "");
    const sourceRef = orderId ? `wc:${orderId}` : null;

    // Idempotency: don't double-create proof for the same order.
    let existing: { id: string } | null = null;
    if (sourceRef) {
      const { data } = await supabase
        .from("proof_objects")
        .select("id")
        .eq("business_id", integ.business_id)
        .eq("source_ref", sourceRef)
        .maybeSingle();
      existing = data ?? null;
    }

    if (!existing) {
      const total = payload.total ? `${payload.total} ${payload.currency ?? "USD"}` : "an order";
      const billing = payload.billing ?? {};
      const fullName =
        [billing.first_name, billing.last_name].filter(Boolean).join(" ") || null;
      const location =
        [billing.city, billing.country].filter(Boolean).join(", ") || null;
      const status = payload.status ?? "";
      // Auto-approve completed/processing orders; keep created drafts pending review.
      const isApproved = status === "completed" || status === "processing";

      const { data: po } = await supabase
        .from("proof_objects")
        .insert({
          business_id: integ.business_id,
          source_type: "purchase",
          source_ref: sourceRef,
          content: `Ordered ${total}`,
          author_name: fullName,
          author_location: location,
          verification_tier: "verified",
          is_approved: isApproved,
        })
        .select("id")
        .single();
      proofId = po?.id ?? null;
    } else {
      proofId = existing.id;
    }
  }

  if (evRow?.id) {
    await supabase
      .from("integration_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", evRow.id);
  }

  await supabase
    .from("integrations")
    .update({
      status: "connected",
      last_event_at: new Date().toISOString(),
    })
    .eq("id", integ.id);

  return json({ received: true, proof_object_id: proofId });
});