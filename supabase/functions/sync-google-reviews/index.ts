import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleReviewsRequest {
  connectorId: string;
  placeId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google API key not configured. Please add GOOGLE_PLACES_API_KEY secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { connectorId, placeId } = await req.json() as GoogleReviewsRequest;

    console.log('Syncing Google reviews for connector:', connectorId);

    // Fetch reviews from Google Places API
    const googleResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${googleApiKey}`
    );

    if (!googleResponse.ok) {
      throw new Error('Failed to fetch Google reviews');
    }

    const googleData = await googleResponse.json();
    
    if (googleData.status !== 'OK') {
      throw new Error(`Google API error: ${googleData.status}`);
    }

    const reviews = googleData.result?.reviews || [];
    
    console.log(`Found ${reviews.length} reviews`);

    // Store reviews in social_items
    const itemsToInsert = reviews.map((review: any) => ({
      connector_id: connectorId,
      external_id: review.author_name + '_' + review.time,
      type: 'review',
      content: {
        text: review.text,
        rating: review.rating,
        author: review.author_name,
        author_photo: review.profile_photo_url,
        time: review.time,
      },
      display_count: 0,
    }));

    // Upsert items (avoid duplicates)
    const { error: insertError } = await supabase
      .from('social_items')
      .upsert(itemsToInsert, { 
        onConflict: 'connector_id,external_id',
        ignoreDuplicates: true 
      });

    if (insertError) throw insertError;

    // Update connector last_sync
    const { error: updateError } = await supabase
      .from('social_connectors')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connectorId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        reviewsCount: reviews.length,
        rating: googleData.result?.rating,
        totalRatings: googleData.result?.user_ratings_total 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing Google reviews:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
