// WooCommerce webhook receiver: verifies HMAC, stores events, creates a
// purchase proof_object, and (if the integration has auto_request_enabled)
// queues a scheduled testimonial request.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";

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
  const rl = await rateLimit({ key: `webhook-woocommerce:${ip}`, max: 600, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  if (!integrationId) return json({ error: "Missing integration_id" }, 400);

  const raw = await req.text();
  const signature = req.headers.get("x-wc-webhook-signature");
  const topic = req.headers.get("x-wc-webhook-topic") ?? "unknown";
  const wcDeliveryId = req.headers.get("x-wc-webhook-delivery-id") ?? req.headers.get("x-wc-webhook-id");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: integ } = await supabase
    .from("integrations")
    .select("id, business_id, platform, auto_request_enabled, auto_request_delay_days, config")
    .eq("id", integrationId)
    .maybeSingle();

  if (!integ || integ.platform !== "woocommerce") return json({ error: "Integration not found" }, 404);

  const webhookSecret = (integ.config as any)?.webhook_secret as string | undefined;

  if (!raw || raw === "{}") return json({ received: true, ping: true });

  if (webhookSecret) {
    const ok = await verifyHmac(raw, signature, webhookSecret);
    if (!ok) return json({ error: "Invalid signature" }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const externalEventId = wcDeliveryId ?? (payload?.id ? `${topic}:${payload.id}` : null);

  // Step 1: store the raw event.
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

  // Step 2: dedupe.
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
    // Only auto-create proof for completed/processing orders.
    const isOrderEvent = topic.startsWith("order.");
    const status = (payload?.status ?? "") as string;
    const isCompleted = topic === "order.completed" || status === "completed" || status === "processing";

    if (isOrderEvent && isCompleted) {
      const orderId = String(payload.id ?? "");
      const sourceRef = orderId ? `wc:${orderId}` : null;

      const billing = payload.billing ?? {};
      customerEmail = (billing.email ?? payload.email ?? null) || null;
      customerName = [billing.first_name, billing.last_name].filter(Boolean).join(" ") || null;
      const productReference: string | null =
        Array.isArray(payload.line_items) && payload.line_items.length > 0
          ? payload.line_items.map((li: any) => li?.name).filter(Boolean).join(", ") || null
          : null;

      // Idempotency: skip if a proof_object already exists for this order.
      let existing: { id: string } | null = null;
      if (orderId) {
        const { data } = await supabase
          .from("proof_objects")
          .select("id")
          .eq("business_id", integ.business_id)
          .eq("source", "woocommerce")
          .eq("external_ref_id", orderId)
          .maybeSingle();
        existing = data ?? null;
      }

      if (!existing) {
        const total = payload.total ? `${payload.total} ${payload.currency ?? "USD"}` : "an order";
        const location = [billing.city, billing.country].filter(Boolean).join(", ") || null;

        const { data: po, error: poErr } = await supabase
          .from("proof_objects")
          .insert({
            business_id: integ.business_id,
            type: "purchase",
            proof_type: "purchase",
            status: "approved",
            verified: true,
            verification_tier_int: 1,
            verification_tier: "verified",
            verification_method: "purchase_matched",
            source: "woocommerce",
            source_metadata: { topic, order_id: payload.id, source_ref: sourceRef, location },
            external_ref_id: orderId || null,
            product_reference: productReference,
            author_name: customerName,
            author_email: customerEmail, // hashed by trigger
            content: `Ordered ${total}`,
            published_at: new Date().toISOString(),
            proof_event_at: new Date().toISOString(),
          })
          .select("id")
          .single();
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
    console.error("woocommerce handler error", e);
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
