import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const websiteId = url.searchParams.get('website_id');

    // GET - Fetch active goals for a website (public endpoint for widget)
    if (req.method === 'GET' && websiteId) {
      console.log('[impact-goals] Fetching goals for website:', websiteId);

      const { data: goals, error } = await supabase
        .from('impact_goals')
        .select('id, name, match_type, match_value, interaction_type, conversion_window_days, monetary_value')
        .eq('website_id', websiteId)
        .eq('is_active', true);

      if (error) {
        console.error('[impact-goals] Error fetching goals:', error);
        throw error;
      }

      console.log('[impact-goals] Found', goals?.length || 0, 'active goals');

      return new Response(JSON.stringify({ goals: goals || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[impact-goals] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
