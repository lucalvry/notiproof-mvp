// Shopify webhook receiver: verifies HMAC, stores events, creates a purchase
// proof_object, and queues a testimonial request when auto-request is enabled.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function maybeCreateTestimonialRequest(
  supabase: any,
  integ: { auto_request_enabled?: boolean | null; auto_request_delay_days?: number | null },
  businessId: string,
  proofId: string,
  customerEmail: string | null,
  customerName: string | null,
) {
  if (!integ.auto_request_enabled || !customerEmail) return;
  const delayDays = Math.max(0, Math.min(60, integ.auto_request_delay_days ?? 14));
  const now = Date.now();
  const sendAt = new Date(now + delayDays * 86400_000).toISOString();
  const expires = new Date(now + (delayDays + 14) * 86400_000).toISOString();

  const { data: req, error: reqErr } = await supabase
    .from("testimonial_requests")
    .insert({
      business_id: businessId,
      proof_object_id: proofId,
      recipient_email: customerEmail,
      recipient_name: customerName,
      requested_type: "testimonial",
      prompt_questions: [],
      status: "scheduled",
      expires_at: expires,
    })
    .select("id")
    .single();
  if (reqErr || !req) {
    console.error("testimonial_requests insert failed", reqErr);
    return;
  }

  await supabase.from("scheduled_jobs").insert({
    business_id: businessId,
    job_type: "send_testimonial_email",
    payload: { testimonial_request_id: req.id },
    run_at: sendAt,
    status: "pending",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = callerIp(req);
  const rl = await rateLimit({ key: `webhook-shopify:${ip}`, max: 600, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  const raw = await req.text();
  const topic = req.headers.get("x-shopify-topic") ?? "unknown";
  const shopDomain = req.headers.get("x-shopify-shop-domain");
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const shopifyEventId = req.headers.get("x-shopify-webhook-id");

  if (SHOPIFY_CLIENT_SECRET) {
    const ok = await verifyHmac(raw, hmac, SHOPIFY_CLIENT_SECRET);
    if (!ok) return json({ error: "Invalid HMAC" }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Resolve integration: by id (preferred) or by shop domain stored in config.
  let integ:
    | { id: string; business_id: string; auto_request_enabled: boolean | null; auto_request_delay_days: number | null }
    | null = null;
  if (integrationId) {
    const { data } = await supabase
      .from("integrations")
      .select("id, business_id, platform, auto_request_enabled, auto_request_delay_days")
      .eq("id", integrationId)
      .maybeSingle();
    if (data?.platform === "shopify") integ = data as any;
  }
  if (!integ && shopDomain) {
    const { data } = await supabase
      .from("integrations")
      .select("id, business_id, config, platform, auto_request_enabled, auto_request_delay_days")
      .eq("platform", "shopify");
    integ = (data?.find((d: any) => (d.config?.shop ?? "") === shopDomain) ?? null) as any;
  }
  if (!integ) return json({ error: "Integration not found" }, 404);

  const externalEventId = shopifyEventId ?? (payload?.id ? `order:${payload.id}:${topic}` : null);

  const { data: evRow, error: insertError } = await supabase
    .from("integration_events")
    .insert({
      business_id: integ.business_id,
      integration_id: integ.id,
      event_type: topic,
      payload,
      external_event_id: externalEventId,
      status: "received",
    })
    .select("id")
    .single();

  if (insertError && (insertError.code === "23505" || /duplicate key/i.test(insertError.message))) {
    await supabase.from("integration_events").insert({
      business_id: integ.business_id,
      integration_id: integ.id,
      event_type: topic,
      payload: { duplicate_of: externalEventId },
      status: "duplicate",
    });
    return json({ received: true, duplicate: true });
  }

  let proofId: string | null = null;
  let handlerError: string | null = null;
  let customerEmail: string | null = null;
  let customerName: string | null = null;

  try {
    // Trigger only on paid orders.
    const isPaidEvent =
      topic === "orders/paid" ||
      (topic === "orders/create" && (payload?.financial_status === "paid"));

    if (isPaidEvent) {
      const orderId = String(payload.id ?? "");
      customerEmail = payload.email ?? payload.customer?.email ?? null;
      customerName =
        payload.customer
          ? [payload.customer.first_name, payload.customer.last_name].filter(Boolean).join(" ") || null
          : null;
      const productReference: string | null =
        Array.isArray(payload.line_items) && payload.line_items.length > 0
          ? payload.line_items.map((li: any) => li?.title).filter(Boolean).join(", ") || null
          : null;

      // Idempotency.
      let existing: { id: string } | null = null;
      if (orderId) {
        const { data } = await supabase
          .from("proof_objects")
          .select("id")
          .eq("business_id", integ.business_id)
          .eq("source", "shopify")
          .eq("external_ref_id", orderId)
          .maybeSingle();
        existing = data ?? null;
      }

      if (!existing) {
        const total = payload.total_price ? `${payload.total_price} ${payload.currency ?? "USD"}` : "an order";
        const { data: po, error: poErr } = await supabase.from("proof_objects").insert({
          business_id: integ.business_id,
          type: "purchase",
          proof_type: "purchase",
          status: "approved",
          verified: true,
          verification_tier_int: 1,
          verification_tier: "verified",
          verification_method: "purchase_matched",
          source: "shopify",
          source_metadata: { topic, order_id: payload.id },
          external_ref_id: orderId || null,
          product_reference: productReference,
          author_name: customerName,
          author_email: customerEmail,
          content: `Ordered ${total}`,
          published_at: new Date().toISOString(),
          proof_event_at: new Date().toISOString(),
        }).select("id").single();
        if (poErr) throw poErr;
        proofId = po?.id ?? null;
      } else {
        proofId = existing.id;
      }

      if (proofId) {
        await maybeCreateTestimonialRequest(
          supabase,
          integ,
          integ.business_id,
          proofId,
          customerEmail,
          customerName,
        );
      }
    }
  } catch (e) {
    handlerError = (e as Error).message;
    console.error("shopify handler error", e);
  }

  if (evRow?.id) {
    await supabase.from("integration_events").update({
      processed_at: handlerError ? null : new Date().toISOString(),
      proof_object_id: proofId,
      status: handlerError ? "failed" : "processed",
      error_message: handlerError,
    }).eq("id", evRow.id);
  }

  await supabase.from("integrations").update({
    status: "connected",
    last_sync_at: new Date().toISOString(),
  }).eq("id", integ.id);

  return json({ received: true, proof_object_id: proofId });
});
