// Stripe webhook receiver:
//   1. Verifies signature.
//   2. For BILLING events (subscription/checkout/invoice) → updates the
//      business plan tier, limits, and subscription identifiers based on the
//      Stripe customer ID. Does NOT require an integration_id query param.
//   3. For INTEGRATION events (purchases, refunds, etc.) routed with an
//      ?integration_id=... param, stores integration_events and creates
//      proof_objects for qualifying events (legacy behavior, preserved).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Plan limits — keep in sync with src/lib/plans.ts
const PLAN_LIMITS: Record<string, { proof: number; events: number }> = {
  free:    { proof: 100,     events: 10_000 },
  starter: { proof: 1_000,   events: 100_000 },
  growth:  { proof: 10_000,  events: 1_000_000 },
  scale:   { proof: 100_000, events: 10_000_000 },
};

// Map Stripe price IDs (read from secrets) to plan keys. Supports both
// monthly and yearly price IDs per plan.
function priceIdToPlan(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  const map: Record<string, string> = {};
  const entries: Array<[string | undefined, string]> = [
    [Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY"), "starter"],
    [Deno.env.get("STRIPE_PRICE_STARTER_YEARLY"), "starter"],
    [Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY"), "growth"],
    [Deno.env.get("STRIPE_PRICE_GROWTH_YEARLY"), "growth"],
    [Deno.env.get("STRIPE_PRICE_SCALE_MONTHLY"), "scale"],
    [Deno.env.get("STRIPE_PRICE_SCALE_YEARLY"), "scale"],
    // Backwards-compat with single-interval secrets if still set.
    [Deno.env.get("STRIPE_PRICE_STARTER"), "starter"],
    [Deno.env.get("STRIPE_PRICE_GROWTH"), "growth"],
    [Deno.env.get("STRIPE_PRICE_SCALE"), "scale"],
  ];
  for (const [id, plan] of entries) {
    if (id) map[id] = plan;
  }
  return map[priceId] ?? null;
}

// Verify Stripe webhook signature (HMAC-SHA256) without the SDK.
async function verify(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signed = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

const BILLING_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
]);

async function handleBillingEvent(
  supabase: any,
  event: { type: string; data: { object: Record<string, unknown> } },
) {
  const obj = event.data.object as Record<string, unknown>;
  const customerId = (obj.customer as string) ?? null;
  if (!customerId) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, plan, plan_tier")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!business) return;

  const updates: Record<string, unknown> = {};

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const items = (obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data ?? [];
    const priceId = items[0]?.price?.id ?? null;
    const planKey = priceIdToPlan(priceId) ?? ((obj.metadata as Record<string, string> | undefined)?.plan_key ?? null);
    const status = obj.status as string;

    updates.stripe_subscription_id = obj.id as string;

    if (status === "active" || status === "trialing") {
      const key = planKey ?? "free";
      updates.plan = key;
      updates.plan_tier = key;
      const limits = PLAN_LIMITS[key];
      if (limits) {
        updates.monthly_proof_limit = limits.proof;
        updates.monthly_event_limit = limits.events;
      }
      const periodEnd = obj.current_period_end as number | undefined;
      if (periodEnd) updates.plan_expires_at = new Date(periodEnd * 1000).toISOString();
    } else if (status === "canceled" || status === "incomplete_expired" || status === "unpaid") {
      updates.plan = "free";
      updates.plan_tier = "free";
      const limits = PLAN_LIMITS.free;
      updates.monthly_proof_limit = limits.proof;
      updates.monthly_event_limit = limits.events;
      updates.plan_expires_at = null;
    }
  } else if (event.type === "customer.subscription.deleted") {
    updates.plan = "free";
    updates.plan_tier = "free";
    updates.stripe_subscription_id = null;
    updates.plan_expires_at = null;
    const limits = PLAN_LIMITS.free;
    updates.monthly_proof_limit = limits.proof;
    updates.monthly_event_limit = limits.events;
  } else if (event.type === "checkout.session.completed") {
    // Persist the subscription id immediately so the UI can reflect changes
    // before the subscription.updated event arrives.
    const subId = (obj.subscription as string) ?? null;
    if (subId) updates.stripe_subscription_id = subId;
    const planKey = (obj.metadata as Record<string, string> | undefined)?.plan_key;
    if (planKey && PLAN_LIMITS[planKey]) {
      updates.plan = planKey;
      updates.plan_tier = planKey;
      updates.monthly_proof_limit = PLAN_LIMITS[planKey].proof;
      updates.monthly_event_limit = PLAN_LIMITS[planKey].events;
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("businesses").update(updates).eq("id", business.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");

  const raw = await req.text();
  const sigHeader = req.headers.get("stripe-signature");

  if (STRIPE_WEBHOOK_SECRET) {
    const ok = await verify(raw, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> }; id?: string };
  try { event = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Billing lifecycle: handle independently of integration_id.
  if (event.type && BILLING_EVENT_TYPES.has(event.type)) {
    try {
      await handleBillingEvent(supabase, event as { type: string; data: { object: Record<string, unknown> } });
    } catch (e) {
      console.error("billing event error", e);
    }
  }

  // 2) Integration-routed events (legacy path) — purchases as proof objects.
  if (integrationId) {
    const { data: integ } = await supabase
      .from("integrations")
      .select("id, business_id, provider")
      .eq("id", integrationId)
      .maybeSingle();

    if (integ && integ.provider === "stripe") {
      const { data: evRow } = await supabase.from("integration_events").insert({
        business_id: integ.business_id,
        integration_id: integ.id,
        event_type: event.type ?? "unknown",
        payload: event,
      }).select("id").single();

      let proofId: string | null = null;
      const obj = (event?.data?.object ?? {}) as Record<string, unknown>;
      if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
        const amount = (obj.amount_total as number) ?? (obj.amount as number) ?? 0;
        const currency = ((obj.currency as string) ?? "usd").toUpperCase();
        const customerDetails = (obj.customer_details as Record<string, unknown> | undefined) ?? {};
        const billingDetails = (obj.billing_details as Record<string, unknown> | undefined) ?? {};
        const customerName = (customerDetails.name as string) ?? (billingDetails.name as string) ?? null;
        const customerEmail = (customerDetails.email as string) ?? (billingDetails.email as string) ?? (obj.receipt_email as string) ?? null;
        const display = amount ? `${(amount / 100).toFixed(2)} ${currency}` : "a purchase";
        const { data: po } = await supabase.from("proof_objects").insert({
          business_id: integ.business_id,
          type: "purchase",
          status: "approved",
          verified: true,
          author_name: customerName,
          author_email: customerEmail,
          content: `Purchased ${display}`,
          source: "stripe",
          source_metadata: { event_id: event.id, event_type: event.type },
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
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
