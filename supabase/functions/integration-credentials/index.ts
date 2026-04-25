// Secure credential management for integrations.
// - Caller must be authenticated and an owner/editor of the business that
//   owns the integration (or platform admin).
// - On GET-style requests we return a masked summary only (never the raw
//   secret), so the UI can show "Connected · ••••1234" without exposing the
//   token to the browser.
// - On set/delete we update credentials with the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
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
      .select("id, business_id, provider, credentials, status")
      .eq("id", integrationId)
      .maybeSingle();
    if (!integ) return json({ error: "Integration not found" }, 404);

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

    const creds = (integ.credentials ?? {}) as Record<string, string | undefined>;

    if (action === "summary") {
      return json({
        ok: true,
        has_token: !!creds.access_token,
        masked_token: maskSecret(creds.access_token ?? null),
        provider: integ.provider,
        status: integ.status,
      });
    }

    if (action === "set") {
      const accessToken = body?.access_token;
      if (typeof accessToken !== "string" || accessToken.trim().length < 4) {
        return json({ error: "Provide a valid access token" }, 400);
      }
      const next = { ...creds, access_token: accessToken.trim() };
      const { error: upErr } = await admin
        .from("integrations")
        .update({ credentials: next, status: "connected", updated_at: new Date().toISOString() })
        .eq("id", integrationId);
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true, masked_token: maskSecret(accessToken) });
    }

    if (action === "clear") {
      const next = { ...creds };
      delete next.access_token;
      const { error: upErr } = await admin
        .from("integrations")
        .update({ credentials: next, status: "disconnected", updated_at: new Date().toISOString() })
        .eq("id", integrationId);
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
