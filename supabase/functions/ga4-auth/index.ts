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

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get GA4 config from admin
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('*')
      .eq('integration_type', 'ga4')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('GA4 not configured:', configError);
      return new Response(JSON.stringify({ error: 'GA4 not configured by administrators' }), { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'start') {
      // Start OAuth flow
      const state = crypto.randomUUID();
      const user_id = url.searchParams.get('user_id');
      const website_id = url.searchParams.get('website_id');

      if (!user_id || !website_id) {
        return new Response(JSON.stringify({ error: 'user_id and website_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store state temporarily for validation
      await supabase.from('integration_logs').insert({
        integration_type: 'ga4',
        action: 'oauth_start',
        status: 'pending',
        user_id,
        details: { state, website_id }
      });

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.config.clientId);
      authUrl.searchParams.set('redirect_uri', config.config.redirect_uri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', config.config.scopes.join(' '));
      authUrl.searchParams.set('state', `${state}|${user_id}|${website_id}`);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return new Response(JSON.stringify({ 
        auth_url: authUrl.toString(), 
        state 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Invalid callback parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse state
      const [stateId, user_id, website_id] = state.split('|');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: config.config.clientId,
          client_secret: config.config.clientSecret,
          redirect_uri: config.config.redirect_uri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to exchange authorization code' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tokens = await tokenResponse.json();

      // Get GA4 properties
      const propertiesResponse = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
        {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        }
      );

      if (!propertiesResponse.ok) {
        console.error('Failed to fetch GA4 properties');
        return new Response(JSON.stringify({ error: 'Failed to fetch GA4 properties' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const properties = await propertiesResponse.json();
      const firstProperty = properties.accountSummaries?.[0]?.propertySummaries?.[0];

      if (!firstProperty) {
        return new Response(JSON.stringify({ error: 'No GA4 properties found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store connector
      const { error: insertError } = await supabase
        .from('integration_connectors')
        .insert({
          user_id,
          website_id,
          integration_type: 'ga4',
          name: 'Google Analytics 4',
          config: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            property_id: firstProperty.property
          },
          status: 'active'
        });

      if (insertError) {
        console.error('Failed to store connector:', insertError);
        throw insertError;
      }

      // Log success
      await supabase.from('integration_logs').insert({
        integration_type: 'ga4',
        action: 'oauth_complete',
        status: 'success',
        user_id,
        details: { property_id: firstProperty.property }
      });

      return new Response(JSON.stringify({ 
        success: true,
        property_id: firstProperty.property 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('GA4 auth error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
