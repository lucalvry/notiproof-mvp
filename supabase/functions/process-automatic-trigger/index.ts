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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_id, trigger_type, data }: TriggerRequest = await req.json();

    console.log(`[process-automatic-trigger] Processing ${trigger_type} trigger for integration ${integration_id}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load integration config
    const { data: integration, error: integrationError } = await supabase
      .from('integration_connectors')
      .select('*, config')
      .eq('id', integration_id)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    // Check if triggers are enabled
    const triggerConfig = integration.config?.trigger_config;
    if (!triggerConfig?.enabled) {
      console.log('[process-automatic-trigger] Triggers not enabled for this integration');
      return new Response(
        JSON.stringify({ success: false, message: 'Triggers not enabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2. Find active testimonial forms for this website
    const { data: forms, error: formsError } = await supabase
      .from('testimonial_forms')
      .select('id, name, slug')
      .eq('website_id', integration.website_id)
      .eq('is_active', true)
      .limit(1);

    if (formsError || !forms || forms.length === 0) {
      throw new Error('No active testimonial form found');
    }

    const form = forms[0];

    // 3. Apply delay if configured
    const delayDays = triggerConfig.delay_days || 0;
    if (delayDays > 0) {
      console.log(`[process-automatic-trigger] Scheduling email for ${delayDays} days from now`);
      // In a production system, you'd use a job queue here
      // For now, we'll just send immediately but could implement scheduling
    }

    // 4. Send invitation email
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
      throw new Error('Failed to send invitation email');
    }

    console.log('[process-automatic-trigger] Trigger processed successfully');

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
