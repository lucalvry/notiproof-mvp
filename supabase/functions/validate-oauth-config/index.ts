import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getOAuthConfig } from '../_shared/oauth-helpers.ts';

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
    const { integration_type } = await req.json();

    if (!integration_type) {
      return new Response(
        JSON.stringify({ valid: false, error: 'integration_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = await getOAuthConfig(supabase, integration_type);

    if (!config) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Configuration not found or incomplete. Please ensure Client ID and Client Secret are set.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip URL reachability test - validation happens during actual OAuth flow
    console.log(`✅ OAuth config validated for ${integration_type}:`, {
      authorization_url: config.authorization_url,
      token_url: config.token_url,
      has_client_id: !!config.clientId,
      has_client_secret: !!config.clientSecret,
      redirect_uri: config.redirect_uri
    });

    return new Response(
      JSON.stringify({ 
        valid: true,
        message: 'OAuth configuration is valid and ready for user connections',
        config: {
          authorization_url: config.authorization_url,
          token_url: config.token_url,
          scopes: config.scopes,
          redirect_uri: config.redirect_uri
        },
        note: 'URLs will be validated during actual OAuth flow when users connect'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
