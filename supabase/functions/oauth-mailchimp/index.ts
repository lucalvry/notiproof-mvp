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

    const config = await getOAuthConfig(supabase, 'mailchimp');
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Mailchimp OAuth not configured by administrators' }),
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

      await logOAuthAction(supabase, 'mailchimp', 'oauth_start', 'pending', user_id, { state, website_id });

      // Build authorization URL from database config
      const authUrl = new URL(config.authorization_url);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('state', `${state}|${user_id}|${website_id}`);
      authUrl.searchParams.set('response_type', config.extra_params.response_type || 'code');

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

      // Get metadata including data center
      const metadataResponse = await fetch('https://login.mailchimp.com/oauth2/metadata', {
        headers: { Authorization: `OAuth ${tokens.access_token}` },
      });
      const metadata = await metadataResponse.json();

      await storeOAuthConnector(
        supabase,
        user_id,
        website_id,
        'mailchimp',
        'Mailchimp Account',
        {
          access_token: tokens.access_token,
          dc: metadata.dc,
          api_endpoint: metadata.api_endpoint,
        }
      );

      await logOAuthAction(supabase, 'mailchimp', 'oauth_complete', 'success', user_id, {});

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
    console.error('Mailchimp OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
