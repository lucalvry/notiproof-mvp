import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get HubSpot OAuth config
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('*')
      .eq('integration_type', 'hubspot')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('HubSpot OAuth not configured:', configError);
      return new Response(
        JSON.stringify({ error: 'HubSpot OAuth not configured by administrators' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'start') {
      const user_id = url.searchParams.get('user_id');
      const website_id = url.searchParams.get('website_id');

      if (!user_id || !website_id) {
        return new Response(
          JSON.stringify({ error: 'user_id and website_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = crypto.randomUUID();

      await supabase.from('integration_logs').insert({
        integration_type: 'hubspot',
        action: 'oauth_start',
        status: 'pending',
        user_id,
        details: { state, website_id }
      });

      const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
      authUrl.searchParams.set('client_id', config.config.clientId);
      authUrl.searchParams.set('redirect_uri', config.config.redirect_uri);
      authUrl.searchParams.set('scope', config.config.scopes.join(' '));
      authUrl.searchParams.set('state', `${state}|${user_id}|${website_id}`);

      return new Response(
        JSON.stringify({ auth_url: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: 'Invalid callback parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const [stateId, user_id, website_id] = state.split('|');

      // Exchange code for access token
      const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.config.clientId,
          client_secret: config.config.clientSecret,
          redirect_uri: config.config.redirect_uri,
          code: code
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange authorization code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();

      // Store connector
      const { error: insertError } = await supabase
        .from('integration_connectors')
        .insert({
          user_id,
          website_id,
          integration_type: 'hubspot',
          name: 'HubSpot CRM',
          config: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            hub_id: tokens.hub_id
          },
          status: 'active'
        });

      if (insertError) {
        console.error('Failed to store connector:', insertError);
        throw insertError;
      }

      await supabase.from('integration_logs').insert({
        integration_type: 'hubspot',
        action: 'oauth_complete',
        status: 'success',
        user_id,
        details: { hub_id: tokens.hub_id }
      });

      return new Response(
        JSON.stringify({ success: true, hub_id: tokens.hub_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('HubSpot OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
