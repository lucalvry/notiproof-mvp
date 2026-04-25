// WooCommerce integration management.
// Stores credentials (consumer_key, consumer_secret, store_url, webhook_secret)
// inside `integrations.credentials` jsonb. No raw secrets ever return to the client.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskPair(ck: string | undefined, cs: string | undefined): string | null {
  if (!ck && !cs) return null;
  const tail = (s: string) => (s.length <= 4 ? "••••" : `••••${s.slice(-4)}`);
  return `${tail(ck ?? "")} : ${tail(cs ?? "")}`;
}

function normalizeStoreUrl(raw: string): string | null {
  try {
    const trimmed = raw.trim().replace(/\/+$/, "");
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

function generateWebhookSecret(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/=+$/, "");
}

function basicAuth(ck: string, cs: string) {
  return "Basic " + btoa(`${ck}:${cs}`);
}

async function wcFetch(storeUrl: string, path: string, ck: string, cs: string) {
  const url = `${storeUrl}/wp-json/wc/v3/${path}`;
  return await fetch(url, {
    headers: { Authorization: basicAuth(ck, cs), Accept: "application/json" },
  });
}

function buildWebhookUrl(integrationId: string) {
  return `${SUPABASE_URL}/functions/v1/webhook-woocommerce?integration_id=${integrationId}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required" }, 401);

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Authentication required" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const integrationId = body?.integration_id as string | undefined;
    if (!action || !integrationId) return json({ error: "Missing action or integration_id" }, 400);

    const { data: integ } = await admin
      .from("integrations")
      .select("id, business_id, platform, provider, credentials, config, status")
      .eq("id", integrationId)
      .maybeSingle();
    if (!integ) return json({ error: "Integration not found" }, 404);
    if (integ.platform !== "woocommerce" && integ.provider !== "woocommerce")
      return json({ error: "Not a WooCommerce integration" }, 400);

    // Authorization: owner/editor of business or platform admin
    const [{ data: profile }, { data: membership }] = await Promise.all([
      admin.from("users").select("is_admin").eq("id", userId).maybeSingle(),
      admin
        .from("business_users")
        .select("role")
        .eq("business_id", integ.business_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const role = membership?.role;
    const allowed = profile?.is_admin || role === "owner" || role === "editor";
    if (!allowed) return json({ error: "Not allowed" }, 403);

    const cfg = (integ.config ?? {}) as Record<string, unknown>;
    const creds = (integ.credentials ?? {}) as Record<string, string | undefined>;
    const storeUrl = creds.store_url ?? (cfg.store_url as string) ?? "";
    const ck = creds.consumer_key;
    const cs = creds.consumer_secret;
    const webhookSecret = creds.webhook_secret ?? null;

    // ---- summary -----------------------------------------------------------
    if (action === "summary") {
      return json({
        ok: true,
        has_credentials: !!(ck && cs),
        masked_key: maskPair(ck, cs),
        store_url: storeUrl,
        webhook_url: buildWebhookUrl(integ.id),
        webhook_secret: webhookSecret,
        status: integ.status,
      });
    }

    // ---- connect -----------------------------------------------------------
    if (action === "connect") {
      const rawUrl = body?.store_url as string | undefined;
      const newCk = (body?.consumer_key as string | undefined)?.trim();
      const newCs = (body?.consumer_secret as string | undefined)?.trim();
      if (!rawUrl || !newCk || !newCs)
        return json({ error: "store_url, consumer_key and consumer_secret are required" }, 400);
      if (!/^ck_[a-z0-9]+/i.test(newCk))
        return json({ error: "Consumer key must start with ck_" }, 400);
      if (!/^cs_[a-z0-9]+/i.test(newCs))
        return json({ error: "Consumer secret must start with cs_" }, 400);
      const normalized = normalizeStoreUrl(rawUrl);
      if (!normalized) return json({ error: "Invalid store URL" }, 400);

      let res: Response;
      try {
        res = await wcFetch(normalized, "system_status", newCk, newCs);
      } catch (e) {
        return json(
          { error: `Could not reach WooCommerce store: ${e instanceof Error ? e.message : "network error"}` },
          502,
        );
      }
      if (res.status === 401 || res.status === 403)
        return json({ error: "Invalid REST API key — check Consumer Key and Secret" }, 401);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return json({ error: `Store returned ${res.status}. ${text.slice(0, 200)}` }, 502);
      }
      await res.text().catch(() => "");

      const newWebhookSecret = webhookSecret ?? generateWebhookSecret();
      const nextCreds = {
        ...creds,
        consumer_key: newCk,
        consumer_secret: newCs,
        store_url: normalized,
        webhook_secret: newWebhookSecret,
      };
      const nextConfig = { ...cfg, store_url: normalized };

      const { error: upErr } = await admin
        .from("integrations")
        .update({
          credentials: nextCreds,
          config: nextConfig,
          status: "connected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", integ.id);
      if (upErr) return json({ error: upErr.message }, 500);

      return json({
        ok: true,
        store_url: normalized,
        webhook_url: buildWebhookUrl(integ.id),
        webhook_secret: newWebhookSecret,
        masked_key: maskPair(newCk, newCs),
      });
    }

    // ---- test --------------------------------------------------------------
    if (action === "test") {
      if (!ck || !cs || !storeUrl) return json({ error: "Not connected yet" }, 400);
      const res = await wcFetch(storeUrl, "system_status", ck, cs).catch(() => null);
      if (res) await res.text().catch(() => "");
      if (!res || !res.ok) {
        await admin
          .from("integrations")
          .update({ status: "error", updated_at: new Date().toISOString() })
          .eq("id", integ.id);
        return json({ ok: false, status: res?.status ?? 0 }, 200);
      }
      await admin
        .from("integrations")
        .update({
          status: "connected",
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integ.id);
      return json({ ok: true });
    }

    // ---- backfill ----------------------------------------------------------
    if (action === "backfill") {
      if (!ck || !cs || !storeUrl) return json({ error: "Not connected yet" }, 400);
      const after = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let imported = 0;
      for (let page = 1; page <= 4; page++) {
        const path = `orders?status=completed,processing&after=${encodeURIComponent(after)}&per_page=50&page=${page}&orderby=date&order=desc`;
        const res = await wcFetch(storeUrl, path, ck, cs).catch(() => null);
        if (!res || !res.ok) {
          if (res) await res.text().catch(() => "");
          break;
        }
        const orders = (await res.json().catch(() => [])) as any[];
        if (!Array.isArray(orders) || orders.length === 0) break;

        for (const o of orders) {
          const sourceRef = `wc:${o.id}`;
          const customerName =
            [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(" ") || null;
          const total = o.total ? `${o.total} ${o.currency ?? "USD"}` : "an order";

          const { data: existing } = await admin
            .from("proof_objects")
            .select("id")
            .eq("business_id", integ.business_id)
            .eq("external_ref_id", sourceRef)
            .maybeSingle();
          if (existing) continue;

          const { data: po } = await admin
            .from("proof_objects")
            .insert({
              business_id: integ.business_id,
              type: "purchase",
              proof_type: "purchase",
              external_ref_id: sourceRef,
              content: `Ordered ${total}`,
              author_name: customerName,
              source: "woocommerce",
              source_metadata: { city: o.billing?.city, country: o.billing?.country },
              verification_tier: "verified",
              verified: true,
              status: "approved",
              proof_event_at: o.date_created ?? new Date().toISOString(),
            })
            .select("id")
            .single();

          await admin.from("integration_events").insert({
            integration_id: integ.id,
            business_id: integ.business_id,
            event_type: "order.backfill",
            payload: o,
            processed_at: new Date().toISOString(),
            proof_object_id: po?.id ?? null,
          });
          if (po?.id) imported++;
        }
        if (orders.length < 50) break;
      }
      await admin
        .from("integrations")
        .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", integ.id);
      return json({ ok: true, imported });
    }

    // ---- clear -------------------------------------------------------------
    if (action === "clear") {
      const next = { ...creds };
      delete next.consumer_key;
      delete next.consumer_secret;
      delete next.webhook_secret;
      const { error: upErr } = await admin
        .from("integrations")
        .update({
          credentials: next,
          status: "disconnected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", integ.id);
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
