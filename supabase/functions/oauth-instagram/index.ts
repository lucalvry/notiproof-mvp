import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getOAuthConfig, logOAuthAction, storeOAuthConnector } from '../_shared/oauth-helpers.ts';
import { generateSuccessCallbackHTML, generateErrorCallbackHTML } from '../_shared/oauth-callback-html.ts';

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

    // Get Instagram OAuth config using helper
    const config = await getOAuthConfig(supabase, 'instagram');

    if (!config) {
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

      await logOAuthAction(supabase, 'instagram', 'oauth_start', 'pending', user_id, { state, website_id });

      const authUrl = new URL(config.authorization_url);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('scope', config.scopes.join(config.scope_separator));
      authUrl.searchParams.set('response_type', config.extra_params.response_type);
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
      const tokenResponse = await fetch(config.token_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: config.redirect_uri,
          code: code
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return new Response(
          generateErrorCallbackHTML(
            'Failed to exchange authorization code. Please try connecting again.',
            'TOKEN_EXCHANGE_FAILED'
          ),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      const shortLivedToken = await tokenResponse.json();

      // Exchange for long-lived token (60 days) if configured
      let finalToken = shortLivedToken;
      
      if (config.extra_params.exchange_long_lived_token) {
        const longLivedResponse = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${config.clientSecret}&access_token=${shortLivedToken.access_token}`
        );

        if (longLivedResponse.ok) {
          finalToken = await longLivedResponse.json();
        } else {
          console.warn('Failed to exchange for long-lived token, using short-lived token');
        }
      }

      const longLivedToken = finalToken;

      // Store connector using helper
      await storeOAuthConnector(
        supabase,
        user_id,
        website_id,
        'instagram',
        'Instagram Account',
        {
          access_token: longLivedToken.access_token,
          token_type: longLivedToken.token_type,
          expires_in: longLivedToken.expires_in,
          user_id: shortLivedToken.user_id,
          token_expires_at: new Date(Date.now() + (longLivedToken.expires_in || 5184000) * 1000).toISOString()
        }
      );

      await logOAuthAction(supabase, 'instagram', 'oauth_complete', 'success', user_id, { user_id: shortLivedToken.user_id });

      return new Response(
        generateSuccessCallbackHTML(),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
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
