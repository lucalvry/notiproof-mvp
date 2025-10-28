import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramSyncRequest {
  connectorId: string;
  accountId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const instagramToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');

    if (!instagramToken) {
      console.error('INSTAGRAM_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Instagram access token not configured. Please add INSTAGRAM_ACCESS_TOKEN secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { connectorId, accountId } = await req.json() as InstagramSyncRequest;

    console.log('Syncing Instagram posts for connector:', connectorId);

    // Get connector config
    const { data: connector } = await supabase
      .from('social_connectors')
      .select('config')
      .eq('id', connectorId)
      .single();

    const igAccountId = accountId || connector?.config?.account_id;

    if (!igAccountId) {
      throw new Error('Instagram account ID not found in configuration');
    }

    // Fetch recent media from Instagram Graph API
    const igResponse = await fetch(
      `https://graph.instagram.com/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${instagramToken}`
    );

    if (!igResponse.ok) {
      throw new Error('Failed to fetch Instagram media');
    }

    const igData = await igResponse.json();
    const posts = igData.data || [];

    console.log(`Found ${posts.length} Instagram posts`);

    // Store posts in social_items
    const itemsToInsert = posts.map((post: any) => ({
      connector_id: connectorId,
      external_id: post.id,
      type: 'instagram_post',
      content: {
        caption: post.caption,
        media_type: post.media_type,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        likes: post.like_count,
        comments: post.comments_count,
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
        postsCount: posts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing Instagram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
