import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, typeform-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook token from query param
    const webhookToken = new URL(req.url).searchParams.get('token');

    if (!webhookToken) {
      console.error('Missing webhook token');
      return new Response(JSON.stringify({ error: 'Missing webhook token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find integration connector by webhook token
    const { data: connector, error: connectorError } = await supabaseClient
      .from('integration_connectors')
      .select('*, websites!inner(id, user_id, domain)')
      .eq('config->>webhook_token', webhookToken)
      .eq('integration_type', 'typeform')
      .eq('status', 'active')
      .single();

    if (connectorError || !connector) {
      console.error('Invalid webhook token', connectorError);
      return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if integration is globally enabled
    const { data: integrationConfig } = await supabaseClient
      .from('integrations_config')
      .select('*')
      .eq('integration_type', 'typeform')
      .eq('is_active', true)
      .maybeSingle();

    if (!integrationConfig) {
      console.error('Typeform integration is disabled by administrators');
      return new Response(JSON.stringify({ 
        error: 'Integration disabled',
        message: 'This integration has been temporarily disabled by administrators'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = await req.json();
    console.log('Typeform webhook received', { 
      connector_id: connector.id,
      event_type: payload.event_type
    });

    // Apply rate limiting using admin-configured value
    const rateLimitKey = `webhook:${connector.id}`;
    const rateLimit = await checkRateLimit(rateLimitKey, {
      max_requests: integrationConfig.config.rate_limit_per_user || 1000,
      window_seconds: 3600 // 1 hour
    });

    if (!rateLimit.allowed) {
      console.log('Rate limit exceeded for connector', connector.id);
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((rateLimit.reset - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': (integrationConfig.config.rate_limit_per_user || 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.reset.toString()
        }
      });
    }

    // Get widget for this website
    const { data: widget } = await supabaseClient
      .from('widgets')
      .select('id')
      .eq('website_id', connector.website_id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!widget) {
      console.error('No active widget found for website', connector.website_id);
      return new Response(JSON.stringify({ 
        error: 'No active widget configured'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract form response details
    const formResponse = payload.form_response;
    const answers = formResponse?.answers || [];
    
    // Try to find name and email from answers
    let userName = 'Someone';
    let userEmail = null;
    
    for (const answer of answers) {
      if (answer.type === 'email' && answer.email) {
        userEmail = answer.email;
      }
      if ((answer.field?.ref?.includes('name') || answer.field?.title?.toLowerCase().includes('name')) && answer.text) {
        userName = answer.text;
      }
    }

    const formTitle = payload.form_response?.definition?.title || 'a form';
    const message = `${userName} just submitted ${formTitle}`;

    // Create event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .insert({
        widget_id: widget.id,
        event_type: 'conversion',
        message_template: message,
        user_name: userName,
        user_location: null,
        page_url: connector.websites.domain,
        event_data: {
          form_id: formResponse?.form_id,
          response_id: formResponse?.token,
          answers: answers.map((a: any) => ({
            type: a.type,
            question: a.field?.title,
            answer: a.text || a.email || a.choice?.label || a.number
          })),
          submitted_at: formResponse?.submitted_at
        },
        source: 'integration',
        integration_type: 'typeform',
        status: 'approved'
      })
      .select()
      .single();

    if (eventError) {
      console.error('Failed to create event', eventError);
      throw eventError;
    }

    // Log integration activity
    await supabaseClient
      .from('integration_logs')
      .insert({
        integration_type: 'typeform',
        action: 'form_submission',
        status: 'success',
        user_id: connector.websites.user_id,
        details: {
          connector_id: connector.id,
          event_id: event.id,
          form_id: formResponse?.form_id
        }
      });

    console.log('Typeform event created successfully', { event_id: event.id });

    return new Response(JSON.stringify({ 
      success: true,
      event_id: event.id
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Typeform webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
