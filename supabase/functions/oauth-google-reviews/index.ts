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
    
    // Read action from URL params (for callback) or request body (for start)
    let action = url.searchParams.get('action');
    let requestBody: any = {};
    
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        action = action || requestBody.action;
      } catch (e) {
        // If body parsing fails, continue with URL params
      }
    }

    const config = await getOAuthConfig(supabase, 'google_reviews');
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Google Reviews OAuth not configured by administrators' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'start') {
      const state = crypto.randomUUID();
      
      // Get user session from auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user_id = user.id;
      const website_id = requestBody.website_id;

      if (!website_id) {
        return new Response(
          JSON.stringify({ error: 'website_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logOAuthAction(supabase, 'google_reviews', 'oauth_start', 'pending', user_id, { state, website_id });

      // Build authorization URL from database config
      const authUrl = new URL(config.authorization_url);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('scope', config.scopes.join(config.scope_separator));
      authUrl.searchParams.set('state', `${state}|${user_id}|${website_id}`);
      authUrl.searchParams.set('response_type', config.extra_params.response_type || 'code');
      
      // Add optional OAuth params from spec
      if (config.extra_params.access_type) {
        authUrl.searchParams.set('access_type', config.extra_params.access_type);
      }
      if (config.extra_params.prompt) {
        authUrl.searchParams.set('prompt', config.extra_params.prompt);
      }

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

      const tokenResponse = await fetch(config.token_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirect_uri,
          grant_type: 'authorization_code',
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
        'google_reviews',
        'Google My Business',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        }
      );

      await logOAuthAction(supabase, 'google_reviews', 'oauth_complete', 'success', user_id, {});

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
    console.error('Google Reviews OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
