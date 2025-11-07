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
    console.log('Starting GA4 campaign polling...');

    // Get campaigns due for polling using our helper function
    const { data: campaigns, error: campaignsError } = await supabase
      .rpc('get_campaigns_due_for_polling');

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns due for polling`);

    const results = [];

    // Poll each campaign
    for (const campaign of campaigns || []) {
      try {
        console.log(`Polling campaign ${campaign.campaign_id}`);
        
        // Call sync-ga4 edge function
        const { data, error } = await supabase.functions.invoke('sync-ga4', {
          body: {
            campaign_id: campaign.campaign_id,
            user_id: campaign.user_id,
            website_id: campaign.website_id,
          }
        });

        if (error) {
          console.error(`Error syncing campaign ${campaign.campaign_id}:`, error);
          results.push({
            campaign_id: campaign.campaign_id,
            success: false,
            error: error.message,
          });
        } else {
          console.log(`Successfully synced campaign ${campaign.campaign_id}:`, data);
          results.push({
            campaign_id: campaign.campaign_id,
            success: true,
            events_synced: data.events_synced,
          });
        }
      } catch (error) {
        console.error(`Exception polling campaign ${campaign.campaign_id}:`, error);
        results.push({
          campaign_id: campaign.campaign_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Polling error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
