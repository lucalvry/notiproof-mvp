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

    const {
      visitor_id,
      session_id,
      website_id,
      campaign_id,
      event_id,
      device_type,
      country,
      utm_source,
      utm_medium,
    } = await req.json();

    console.log('👤 Tracking visitor journey:', {
      visitor_id,
      session_id,
      campaign_id,
    });

    // Validate required fields
    if (!visitor_id || !session_id || !website_id || !campaign_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: visitor_id, session_id, website_id, campaign_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get existing journey or create new one
    const { data: existingJourney } = await supabase
      .from('visitor_journeys')
      .select('*')
      .eq('visitor_id', visitor_id)
      .eq('session_id', session_id)
      .single();

    const touchpoint = {
      campaign_id,
      event_id,
      timestamp: new Date().toISOString(),
    };

    if (existingJourney) {
      // Update existing journey
      const updatedViews = [...(existingJourney.notifications_viewed || []), touchpoint];
      
      const { error } = await supabase
        .from('visitor_journeys')
        .update({
          last_seen_at: new Date().toISOString(),
          notifications_viewed: updatedViews,
        })
        .eq('id', existingJourney.id);

      if (error) throw error;

      console.log('✅ Updated existing journey');
    } else {
      // Create new journey
      const { error } = await supabase
        .from('visitor_journeys')
        .insert({
          visitor_id,
          session_id,
          website_id,
          notifications_viewed: [touchpoint],
          device_type,
          country,
          utm_source,
          utm_medium,
        });

      if (error) throw error;

      console.log('✅ Created new journey');
    }

    // Send to Google Analytics if configured
    try {
      const { data: gaConfig } = await supabase
        .from('ga_integration_config')
        .select('*')
        .eq('website_id', website_id)
        .eq('enabled', true)
        .single();

      if (gaConfig?.measurement_id && gaConfig?.api_secret) {
        const gaPayload = {
          client_id: visitor_id,
          events: [{
            name: gaConfig.event_mapping?.notification_view || 'notification_impression',
            params: {
              campaign_id,
              event_id,
              session_id,
            },
          }],
        };

        await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${gaConfig.measurement_id}&api_secret=${gaConfig.api_secret}`,
          {
            method: 'POST',
            body: JSON.stringify(gaPayload),
          }
        );
      }
    } catch (gaError) {
      console.error('⚠️ GA integration error (non-fatal):', gaError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Visitor journey tracked successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in track-visitor-journey:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
