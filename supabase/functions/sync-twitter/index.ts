import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwitterSyncRequest {
  connectorId: string;
  username?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const twitterBearerToken = Deno.env.get('TWITTER_BEARER_TOKEN');

    if (!twitterBearerToken) {
      console.error('TWITTER_BEARER_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Twitter bearer token not configured. Please add TWITTER_BEARER_TOKEN secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { connectorId, username } = await req.json() as TwitterSyncRequest;

    console.log('Syncing Twitter posts for connector:', connectorId);

    // Get connector config
    const { data: connector } = await supabase
      .from('social_connectors')
      .select('config')
      .eq('id', connectorId)
      .single();

    const twitterUsername = username || connector?.config?.username;

    if (!twitterUsername) {
      throw new Error('Twitter username not found in configuration');
    }

    // First, get user ID from username
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${twitterUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Twitter user');
    }

    const userData = await userResponse.json();
    const userId = userData.data?.id;

    if (!userId) {
      throw new Error('Twitter user not found');
    }

    // Fetch recent tweets
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,text`,
      {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
        },
      }
    );

    if (!tweetsResponse.ok) {
      throw new Error('Failed to fetch tweets');
    }

    const tweetsData = await tweetsResponse.json();
    const tweets = tweetsData.data || [];

    console.log(`Found ${tweets.length} tweets`);

    // Store tweets in social_items
    const itemsToInsert = tweets.map((tweet: any) => ({
      connector_id: connectorId,
      external_id: tweet.id,
      type: 'tweet',
      content: {
        text: tweet.text,
        created_at: tweet.created_at,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        url: `https://twitter.com/${twitterUsername}/status/${tweet.id}`,
      },
      display_count: 0,
    }));

    // Upsert items
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
        tweetsCount: tweets.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing Twitter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
