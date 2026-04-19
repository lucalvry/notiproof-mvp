import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getCorsHeaders } from "../_shared/cors.ts";

interface TriggerRequest {
  integration_id: string;
  trigger_type: 'stripe_purchase' | 'mailchimp_subscribe' | 'calendly_booking' | 'custom_webhook';
  data: {
    email: string;
    name?: string;
    [key: string]: any;
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- AUTH: require a Bearer token belonging to a real user ----
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing bearer token' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client bound to caller's JWT — used for identity + ownership checks
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    const callerId = userData.user.id;

    // ---- INPUT VALIDATION ----
    let body: TriggerRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { integration_id, trigger_type, data } = body || {} as TriggerRequest;
    const allowedTriggers = ['stripe_purchase', 'mailchimp_subscribe', 'calendly_booking', 'custom_webhook'];

    if (!integration_id || typeof integration_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'integration_id is required' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    if (!trigger_type || !allowedTriggers.includes(trigger_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid trigger_type' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    if (!data?.email || typeof data.email !== 'string' || !EMAIL_RE.test(data.email)) {
      return new Response(
        JSON.stringify({ error: 'A valid data.email is required' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`[process-automatic-trigger] User ${callerId} processing ${trigger_type} for integration ${integration_id}`);

    // Service-role client for privileged reads/writes after ownership is verified
    const supabase = createClient(supabaseUrl, serviceKey);

    // ---- OWNERSHIP CHECK ----
    const { data: integration, error: integrationError } = await supabase
      .from('integration_connectors')
      .select('id, user_id, website_id, config')
      .eq('id', integration_id)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (integration.user_id !== callerId) {
      console.warn(`[process-automatic-trigger] Forbidden: user ${callerId} is not the owner of integration ${integration_id}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: you do not own this integration' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if triggers are enabled
    const triggerConfig = (integration.config as any)?.trigger_config;
    if (!triggerConfig?.enabled) {
      return new Response(
        JSON.stringify({ success: false, message: 'Triggers not enabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ---- RATE LIMIT: per integration, max 100 emails/hour ----
    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: rateErr } = await supabase
      .from('integration_logs')
      .select('id', { count: 'exact', head: true })
      .eq('integration_type', 'automatic_trigger')
      .eq('user_id', callerId)
      .gte('created_at', sinceIso)
      .filter('details->>integration_id', 'eq', integration_id);

    if (!rateErr && (recentCount ?? 0) >= 100) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded: 100 trigger emails per hour per integration' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // ---- Find active testimonial form ----
    const { data: forms, error: formsError } = await supabase
      .from('testimonial_forms')
      .select('id, name, slug')
      .eq('website_id', integration.website_id)
      .eq('is_active', true)
      .limit(1);

    if (formsError || !forms || forms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active testimonial form found' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const form = forms[0];

    const delayDays = triggerConfig.delay_days || 0;
    if (delayDays > 0) {
      console.log(`[process-automatic-trigger] Scheduling email for ${delayDays} days from now`);
    }

    // ---- Send invitation ----
    const inviteResponse = await supabase.functions.invoke('send-testimonial-invite', {
      body: {
        form_id: form.id,
        email: data.email,
        name: data.name,
        is_test: false,
      },
    });

    if (inviteResponse.error) {
      console.error('[process-automatic-trigger] Failed to send invite:', inviteResponse.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    // Log success for rate-limit accounting
    await supabase.from('integration_logs').insert({
      integration_type: 'automatic_trigger',
      action: trigger_type,
      status: 'success',
      user_id: callerId,
      details: { integration_id, form_id: form.id, email: data.email },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation sent automatically",
        trigger_type,
        form_id: form.id,
        email: data.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[process-automatic-trigger] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
