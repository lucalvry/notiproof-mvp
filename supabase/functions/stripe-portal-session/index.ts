import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) return json({ error: "Authentication required" }, 401);

    const { business_id, return_url } = await req.json().catch(() => ({}));
    if (!business_id || typeof business_id !== "string") return json({ error: "Missing business_id" }, 400);

    const { data: membership } = await admin
      .from("business_users")
      .select("role")
      .eq("business_id", business_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const { data: profile } = await admin
      .from("users")
      .select("is_admin, email")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!membership && !profile?.is_admin) return json({ error: "Not allowed" }, 403);

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, name, stripe_customer_id")
      .eq("id", business_id)
      .maybeSingle();

    if (businessError || !business) return json({ error: "Business not found" }, 404);

    let customerId = business.stripe_customer_id as string | null;
    if (!customerId) {
      const createCustomer = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: business.name,
          email: profile?.email ?? userData.user.email ?? "",
          "metadata[business_id]": business.id,
        }),
      });
      const customer = await createCustomer.json();
      if (!createCustomer.ok) return json({ error: customer?.error?.message ?? "Unable to create billing customer" }, 502);
      customerId = customer.id;
      await admin.from("businesses").update({ stripe_customer_id: customerId }).eq("id", business_id);
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const portalReturnUrl = typeof return_url === "string" && return_url.startsWith("http") ? return_url : `${origin}/settings/billing`;
    const createSession = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ customer: customerId as string, return_url: portalReturnUrl }),
    });
    const session = await createSession.json();
    if (!createSession.ok) return json({ error: session?.error?.message ?? "Unable to open billing portal" }, 502);

    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
