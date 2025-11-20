import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  provider: string;
  websiteId: string;
  name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ConnectRequest = await req.json();
    const { provider, websiteId, name } = body;

    console.log(`Connecting native integration: ${provider} for user ${user.id}`);

    // Validate required fields
    if (!provider || !websiteId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: provider, websiteId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that this is a native integration
    const nativeIntegrations = ['testimonials', 'announcements', 'live_visitors', 'instant_capture'];
    if (!nativeIntegrations.includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'This integration is not a native integration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if website belongs to user
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, user_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website || website.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Website not found or unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('website_id', websiteId)
      .eq('provider', provider)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      console.log(`Integration already exists: ${existing.id}`);
      return new Response(
        JSON.stringify({
          success: true,
          integration_id: existing.id,
          message: 'Integration already connected',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create integration record
    const integrationName = name || provider.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    const { data: integration, error: insertError } = await supabase
      .from('integrations')
      .insert({
        user_id: user.id,
        website_id: websiteId,
        provider,
        name: integrationName,
        is_active: true,
        credentials: {},
        sync_status: { success: true, message: 'Native integration enabled' },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating integration:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create integration', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully connected integration: ${integration.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        integration_id: integration.id,
        integration,
        message: 'Integration connected successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in connect-native-integration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
