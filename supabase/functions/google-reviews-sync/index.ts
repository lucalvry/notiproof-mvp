import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { connector_id, widget_id } = await req.json();

    if (!widget_id) {
      return new Response(JSON.stringify({ 
        error: 'Widget ID is required. Please configure a target widget for this connector.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connector details
    const { data: connector, error: connectorError } = await supabase
      .from('social_connectors')
      .select('*')
      .eq('id', connector_id)
      .eq('type', 'google_reviews')
      .single();

    if (connectorError || !connector) {
      return new Response(JSON.stringify({ 
        error: 'Google Reviews connector not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { place_id } = connector.config;
    if (!place_id) {
      return new Response(JSON.stringify({ 
        error: 'Place ID is required for Google Reviews. Please configure the connector properly.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Google Places API key not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch reviews from Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,reviews,rating&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result?.reviews) {
      let errorMsg = 'Google Places API error';
      if (data.status === 'NOT_FOUND') {
        errorMsg = 'Place ID not found. Please check your Google Places ID.';
      } else if (data.status === 'REQUEST_DENIED') {
        errorMsg = 'Google API request denied. Please check API key permissions.';
      } else {
        errorMsg = `Google Places API error: ${data.status}`;
      }
      
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${data.result.reviews.length} reviews for place ${place_id}`);

    // Use social-sync function to properly handle reviews through social_items first
    const { error: socialSyncError } = await supabase.functions.invoke('social-sync', {
      body: { connector_id: connector_id }
    });

    if (socialSyncError) {
      console.error('Error calling social-sync:', socialSyncError);
      throw socialSyncError;
    }

    // Then convert approved social items to events
    const { error: conversionError } = await supabase.functions.invoke('social-items-to-events', {
      body: { connector_id: connector_id, widget_id: widget_id }
    });

    if (conversionError) {
      console.error('Error converting social items to events:', conversionError);
      throw conversionError;
    }

    // Update connector last sync time
    await supabase
      .from('social_connectors')
      .update({ 
        last_sync: new Date().toISOString(),
        status: 'active' 
      })
      .eq('id', connector_id);

    console.log(`Successfully synced Google reviews for connector ${connector_id} via social-items flow`);

    return new Response(JSON.stringify({ 
      success: true, 
      reviews_synced: data.result.reviews.length,
      place_name: data.result.name,
      place_rating: data.result.rating
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-reviews-sync function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});