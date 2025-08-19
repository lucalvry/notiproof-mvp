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

    if (!connector_id || !widget_id) {
      return new Response(JSON.stringify({ 
        error: 'Both connector_id and widget_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get approved social items that haven't been converted to events yet
    const { data: socialItems, error: fetchError } = await supabase
      .from('social_items')
      .select('*')
      .eq('connector_id', connector_id)
      .eq('moderation_status', 'approved')
      .is('converted_to_event', null); // Assuming we'll add this flag

    if (fetchError) {
      console.error('Error fetching social items:', fetchError);
      throw fetchError;
    }

    if (!socialItems || socialItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No approved social items to convert',
        events_created: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert social items to events with proper formatting
    const events = socialItems.map(item => {
      let formattedMessage = '';
      let user_location = 'Verified Customer';

      // Format message based on item type
      if (item.type === 'review') {
        const stars = '⭐'.repeat(item.rating || 5);
        const ratingText = item.rating ? `${item.rating}-star` : '5-star';
        
        // Extract location from content if possible (basic extraction)
        if (item.content && item.content.toLowerCase().includes('lagos')) {
          user_location = 'Lagos, Nigeria';
        } else if (item.content && item.content.toLowerCase().includes('abuja')) {
          user_location = 'Abuja, Nigeria';
        } else if (item.content && item.content.toLowerCase().includes('port harcourt')) {
          user_location = 'Port Harcourt, Nigeria';
        }

        formattedMessage = `${stars} ${item.author_name} left a ${ratingText} review: "${item.content}"`;
      } else if (item.type === 'tweet') {
        formattedMessage = `💬 ${item.author_name} mentioned us: "${item.content}"`;
        user_location = 'Social Media';
      } else if (item.type === 'post') {
        formattedMessage = `📸 ${item.author_name} shared: "${item.content}"`;
        user_location = 'Social Media';
      }

      return {
        widget_id: widget_id,
        event_type: item.type === 'review' ? 'review' : 'social',
        event_data: {
          message: formattedMessage,
          author_name: item.author_name,
          author_avatar: item.author_avatar,
          rating: item.rating,
          source: 'social_connector',
          connector_id: connector_id,
          social_item_id: item.id,
          posted_at: item.posted_at,
          source_url: item.source_url
        },
        user_name: item.author_name,
        user_location: user_location,
        message_template: formattedMessage,
        source: 'connector',
        status: 'approved', // Already approved in social_items
        flagged: false,
        created_at: new Date().toISOString()
      };
    });

    // Insert events
    const { error: insertError } = await supabase
      .from('events')
      .insert(events);

    if (insertError) {
      console.error('Error inserting events:', insertError);
      throw insertError;
    }

    // Mark social items as converted (we'll need to add this column)
    const socialItemIds = socialItems.map(item => item.id);
    
    // For now, we'll update moderation_status to 'converted' to track this
    // In a future migration, we can add a proper converted_to_event boolean column
    const { error: updateError } = await supabase
      .from('social_items')
      .update({ moderation_status: 'converted' })
      .in('id', socialItemIds);

    if (updateError) {
      console.error('Error updating social items:', updateError);
      // Don't throw here as events were created successfully
    }

    console.log(`Successfully converted ${events.length} social items to events for widget ${widget_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      events_created: events.length,
      widget_id: widget_id,
      connector_id: connector_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in social-items-to-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});