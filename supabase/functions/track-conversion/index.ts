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
      conversion_type,
      conversion_value = 0,
      currency = 'USD',
      conversion_data = {},
    } = await req.json();

    console.log('📊 Tracking conversion:', {
      visitor_id,
      session_id,
      website_id,
      conversion_type,
      conversion_value,
    });

    // Validate required fields
    if (!visitor_id || !session_id || !website_id || !conversion_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: visitor_id, session_id, website_id, conversion_type',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call the database function to record conversion
    const { data, error } = await supabase.rpc('record_conversion', {
      _visitor_id: visitor_id,
      _session_id: session_id,
      _website_id: website_id,
      _conversion_type: conversion_type,
      _conversion_value: conversion_value,
      _conversion_data: conversion_data,
    });

    if (error) {
      console.error('❌ Error recording conversion:', error);
      
      // If no journey found, this is okay - just track as unattributed
      if (error.message.includes('No journey found')) {
        console.log('ℹ️ No visitor journey found - conversion not attributed to notification');
        return new Response(
          JSON.stringify({
            success: true,
            attributed: false,
            message: 'Conversion recorded but not attributed to any notification',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw error;
    }

    console.log('✅ Conversion recorded with ID:', data);

    // Send to Google Analytics if configured
    try {
      const { data: gaConfig } = await supabase
        .from('ga_integration_config')
        .select('*')
        .eq('website_id', website_id)
        .eq('enabled', true)
        .single();

      if (gaConfig?.measurement_id && gaConfig?.api_secret) {
        console.log('📤 Sending to Google Analytics...');
        
        const gaPayload = {
          client_id: visitor_id,
          events: [{
            name: gaConfig.event_mapping?.conversion || 'notification_conversion',
            params: {
              conversion_type,
              value: conversion_value,
              currency,
              session_id,
            },
          }],
        };

        const gaResponse = await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${gaConfig.measurement_id}&api_secret=${gaConfig.api_secret}`,
          {
            method: 'POST',
            body: JSON.stringify(gaPayload),
          }
        );

        if (gaResponse.ok) {
          console.log('✅ Sent to Google Analytics');
        } else {
          console.error('⚠️ Failed to send to GA:', await gaResponse.text());
        }
      }
    } catch (gaError) {
      console.error('⚠️ GA integration error (non-fatal):', gaError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        attributed: true,
        conversion_id: data,
        message: 'Conversion tracked and attributed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in track-conversion:', error);
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
