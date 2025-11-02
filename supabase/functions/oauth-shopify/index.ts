import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyOAuthRequest {
  action: 'start' | 'callback';
  shop?: string;
  code?: string;
  state?: string;
  user_id?: string;
  website_id?: string;
}

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

    // Get Shopify OAuth config from integrations_config table
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('*')
      .eq('integration_type', 'shopify')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Shopify OAuth not configured:', configError);
      return new Response(
        JSON.stringify({ error: 'Shopify OAuth not configured by administrators' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'start') {
      // Start OAuth flow
      const shop = url.searchParams.get('shop');
      const user_id = url.searchParams.get('user_id');
      const website_id = url.searchParams.get('website_id');

      if (!shop || !user_id || !website_id) {
        return new Response(
          JSON.stringify({ error: 'shop, user_id, and website_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = crypto.randomUUID();

      // Store state for validation
      await supabase.from('integration_logs').insert({
        integration_type: 'shopify',
        action: 'oauth_start',
        status: 'pending',
        user_id,
        details: { state, website_id, shop }
      });

      const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
      const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${config.config.clientId}&scope=${config.config.scopes.join(',')}&redirect_uri=${config.config.redirect_uri}&state=${state}|${user_id}|${website_id}&grant_options[]=per-user`;

      return new Response(
        JSON.stringify({ auth_url: authUrl, state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const shop = url.searchParams.get('shop');
      const state = url.searchParams.get('state');

      if (!code || !shop || !state) {
        return new Response(
          JSON.stringify({ error: 'Invalid callback parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const [stateId, user_id, website_id] = state.split('|');

      // Exchange code for access token
      const tokenUrl = `https://${shop}/admin/oauth/access_token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.config.clientId,
          client_secret: config.config.clientSecret,
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
          integration_type: 'shopify',
          name: 'Shopify Store',
          config: {
            access_token: tokens.access_token,
            shop: shop,
            scope: tokens.scope
          },
          status: 'active'
        });

      if (insertError) {
        console.error('Failed to store connector:', insertError);
        throw insertError;
      }

      // Log success
      await supabase.from('integration_logs').insert({
        integration_type: 'shopify',
        action: 'oauth_complete',
        status: 'success',
        user_id,
        details: { shop }
      });

      return new Response(
        JSON.stringify({ success: true, shop }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Shopify OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
