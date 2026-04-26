// Daily cron job: deletes widget_events older than each business's plan
// data retention window. Triggered by a pg_cron + pg_net schedule (see
// migration). Safe to run manually too — no destructive side effects beyond
// purging analytics rows already past retention.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { data: businesses, error: bErr } = await supabase
      .from("businesses")
      .select("id, plan");
    if (bErr) throw bErr;

    let totalDeleted = 0;
    const perBusiness: Array<{ business_id: string; plan: string; retention_days: number; deleted: number }> = [];

    for (const biz of businesses ?? []) {
      const plan = (biz as any).plan ?? "free";
      const { data: limits } = await supabase.rpc("plan_limits", { _plan: plan });
      const retention = (limits as any)?.[0]?.data_retention_days ?? null;
      // Treat the "unlimited" sentinel (~36500) as no purge required.
      if (!retention || retention >= 36500) continue;

      const cutoff = new Date(Date.now() - retention * 24 * 60 * 60 * 1000).toISOString();
      const { error: dErr, count } = await supabase
        .from("widget_events")
        .delete({ count: "exact" })
        .eq("business_id", (biz as any).id)
        .lt("fired_at", cutoff);
      if (dErr) {
        perBusiness.push({ business_id: (biz as any).id, plan, retention_days: retention, deleted: -1 });
        continue;
      }
      totalDeleted += count ?? 0;
      perBusiness.push({ business_id: (biz as any).id, plan, retention_days: retention, deleted: count ?? 0 });
    }

    return json({ ok: true, total_deleted: totalDeleted, businesses: perBusiness });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
