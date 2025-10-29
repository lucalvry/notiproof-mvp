import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { website_id, name, integration_type, field_mapping } = await req.json();

    console.log('Creating webhook connector', { 
      user_id: user.id, 
      website_id, 
      integration_type 
    });

    // Check if integration is enabled globally
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('*')
      .eq('integration_type', integration_type)
      .single();

    if (configError || !config) {
      console.error('Integration not configured:', configError);
      return new Response(JSON.stringify({ 
        error: 'Integration not available',
        message: 'This integration has not been configured by administrators'
      }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!config.is_active) {
      return new Response(JSON.stringify({ 
        error: 'Integration disabled',
        message: 'This integration is currently disabled'
      }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check user's plan quota
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const userPlan = subscription?.subscription_plans?.name?.toLowerCase() || 'free';
    const quotaConfig = config.config?.quota_per_plan || { free: 1, pro: 5, business: 20 };
    const quota = quotaConfig[userPlan as keyof typeof quotaConfig] || 1;

    // Check existing connectors
    const { data: existingConnectors } = await supabase
      .from('integration_connectors')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_type', integration_type);

    if (existingConnectors && existingConnectors.length >= quota) {
      return new Response(JSON.stringify({ 
        error: 'Quota exceeded',
        message: `Your ${userPlan} plan allows ${quota} ${integration_type} connector(s). Upgrade to add more.`,
        current_count: existingConnectors.length,
        max_allowed: quota
      }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate secure token server-side using crypto API
    const webhookToken = `whk_${crypto.randomUUID().replace(/-/g, '')}`;
    
    // Determine endpoint based on integration type
    const endpoint = integration_type === 'typeform' ? 'webhook-typeform' :
                    integration_type === 'calendly' ? 'webhook-calendly' :
                    'webhook-generic';
    
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${endpoint}?token=${webhookToken}`;

    // Create connector
    const { data: connector, error } = await supabase
      .from('integration_connectors')
      .insert({
        user_id: user.id,
        website_id,
        integration_type,
        name,
        config: {
          webhook_token: webhookToken,
          webhook_url: webhookUrl,
          field_mapping: field_mapping || {
            message: "message",
            user_name: "user.name",
            user_location: "user.location",
            event_type: "type",
            page_url: "url"
          },
          created_via: 'api',
          rate_limit: config.config?.rate_limit_per_user || 1000
        },
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating connector:', error);
      throw error;
    }

    // Log creation
    await supabase.from('integration_logs').insert({
      integration_type,
      action: 'connector_created',
      status: 'success',
      user_id: user.id,
      details: { connector_id: connector.id, website_id }
    });

    console.log('Webhook connector created successfully', { connector_id: connector.id });

    return new Response(JSON.stringify({ 
      success: true,
      connector,
      webhook_url: webhookUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create webhook connector error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
