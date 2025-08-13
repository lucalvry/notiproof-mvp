import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialConnector {
  id: string;
  type: string;
  config: any;
  user_id: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function syncGoogleReviews(connector: SocialConnector) {
  const { place_id } = connector.config;
  if (!place_id) throw new Error('Place ID is required for Google Reviews');

  const API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!API_KEY) throw new Error('Google Places API key not configured');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=reviews&key=${API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.result?.reviews) return [];

  const items = data.result.reviews.map((review: any) => ({
    connector_id: connector.id,
    external_id: `google_${review.time}`,
    type: 'review',
    content: review.text,
    author_name: review.author_name,
    author_avatar: review.profile_photo_url,
    rating: review.rating,
    posted_at: new Date(review.time * 1000).toISOString(),
  }));

  return items;
}

async function syncTwitter(connector: SocialConnector) {
  const { search_term } = connector.config;
  if (!search_term) throw new Error('Search term is required for Twitter');

  const BEARER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');
  if (!BEARER_TOKEN) throw new Error('Twitter Bearer token not configured');

  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(search_term)}&max_results=10&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=name,profile_image_url`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
    },
  });

  const data = await response.json();
  
  if (!data.data) return [];

  const users = data.includes?.users || [];
  const userMap = users.reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {});

  const items = data.data.map((tweet: any) => {
    const author = userMap[tweet.author_id];
    return {
      connector_id: connector.id,
      external_id: `twitter_${tweet.id}`,
      type: 'tweet',
      content: tweet.text,
      author_name: author?.name,
      author_avatar: author?.profile_image_url,
      source_url: `https://twitter.com/i/web/status/${tweet.id}`,
      posted_at: tweet.created_at,
    };
  });

  return items;
}

async function syncInstagram(connector: SocialConnector) {
  const { hashtag } = connector.config;
  if (!hashtag) throw new Error('Hashtag is required for Instagram');

  const ACCESS_TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  if (!ACCESS_TOKEN) throw new Error('Instagram access token not configured');

  // Note: This requires Instagram Basic Display API setup
  const url = `https://graph.instagram.com/v18.0/ig_hashtag_search?user_id=self&q=${encodeURIComponent(hashtag)}&access_token=${ACCESS_TOKEN}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.data) return [];

  const items = data.data.slice(0, 10).map((post: any) => ({
    connector_id: connector.id,
    external_id: `instagram_${post.id}`,
    type: 'post',
    content: post.caption || '',
    author_name: post.username,
    author_avatar: post.profile_picture_url,
    source_url: post.permalink,
    posted_at: post.timestamp,
  }));

  return items;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connector_id } = await req.json();

    // Get connector details
    const { data: connector, error: connectorError } = await supabase
      .from('social_connectors')
      .select('*')
      .eq('id', connector_id)
      .single();

    if (connectorError || !connector) {
      throw new Error('Connector not found');
    }

    let items: any[] = [];

    // Sync based on connector type
    switch (connector.type) {
      case 'google_reviews':
        items = await syncGoogleReviews(connector);
        break;
      case 'twitter':
        items = await syncTwitter(connector);
        break;
      case 'instagram':
        items = await syncInstagram(connector);
        break;
      default:
        throw new Error(`Unsupported connector type: ${connector.type}`);
    }

    // Insert new items
    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from('social_items')
        .upsert(items, { onConflict: 'connector_id,external_id' });

      if (insertError) {
        console.error('Error inserting social items:', insertError);
        throw insertError;
      }
    }

    // Update last sync time
    await supabase
      .from('social_connectors')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connector_id);

    console.log(`Synced ${items.length} items for connector ${connector_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      items_synced: items.length,
      connector_type: connector.type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in social-sync function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});