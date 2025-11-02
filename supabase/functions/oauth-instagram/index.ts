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

    // Get Instagram OAuth config
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('*')
      .eq('integration_type', 'instagram')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Instagram OAuth not configured:', configError);
      return new Response(
        JSON.stringify({ error: 'Instagram OAuth not configured by administrators' }),
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
        integration_type: 'instagram',
        action: 'oauth_start',
        status: 'pending',
        user_id,
        details: { state, website_id }
      });

      const authUrl = new URL('https://api.instagram.com/oauth/authorize');
      authUrl.searchParams.set('client_id', config.config.clientId);
      authUrl.searchParams.set('redirect_uri', config.config.redirect_uri);
      authUrl.searchParams.set('scope', config.config.scopes.join(','));
      authUrl.searchParams.set('response_type', 'code');
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

      // Exchange code for short-lived token
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.config.clientId,
          client_secret: config.config.clientSecret,
          grant_type: 'authorization_code',
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

      const shortLivedToken = await tokenResponse.json();

      // Exchange for long-lived token (60 days)
      const longLivedResponse = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${config.config.clientSecret}&access_token=${shortLivedToken.access_token}`
      );

      if (!longLivedResponse.ok) {
        console.error('Long-lived token exchange failed');
        return new Response(
          JSON.stringify({ error: 'Failed to get long-lived token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const longLivedToken = await longLivedResponse.json();

      // Store connector
      const { error: insertError } = await supabase
        .from('integration_connectors')
        .insert({
          user_id,
          website_id,
          integration_type: 'instagram',
          name: 'Instagram Account',
          config: {
            access_token: longLivedToken.access_token,
            token_type: longLivedToken.token_type,
            expires_in: longLivedToken.expires_in,
            user_id: shortLivedToken.user_id,
            token_expires_at: new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString()
          },
          status: 'active'
        });

      if (insertError) {
        console.error('Failed to store connector:', insertError);
        throw insertError;
      }

      await supabase.from('integration_logs').insert({
        integration_type: 'instagram',
        action: 'oauth_complete',
        status: 'success',
        user_id,
        details: { user_id: shortLivedToken.user_id }
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
