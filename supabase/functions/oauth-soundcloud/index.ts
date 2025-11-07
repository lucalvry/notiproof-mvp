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

    const config = await getOAuthConfig(supabase, 'soundcloud');
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'SoundCloud OAuth not configured by administrators' }),
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

      await logOAuthAction(supabase, 'soundcloud', 'oauth_start', 'pending', user_id, { state, website_id });

      const authUrl = new URL('https://soundcloud.com/connect');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('scope', config.scopes.join(' '));
      authUrl.searchParams.set('state', `${state}|${user_id}|${website_id}`);
      authUrl.searchParams.set('response_type', 'code');

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

      const tokenResponse = await fetch('https://api.soundcloud.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirect_uri,
          code,
        }),
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

      const tokens = await tokenResponse.json();

      await storeOAuthConnector(
        supabase,
        user_id,
        website_id,
        'soundcloud',
        'SoundCloud Artist Account',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        }
      );

      await logOAuthAction(supabase, 'soundcloud', 'oauth_complete', 'success', user_id, {});

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
    console.error('SoundCloud OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
