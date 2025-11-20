import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { websiteId, minRating, mediaFilter, onlyVerified, formId } = await req.json();

    if (!websiteId) {
      return new Response(
        JSON.stringify({ error: 'websiteId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync-testimonials] Fetching testimonials for website:', websiteId, {
      minRating,
      mediaFilter,
      onlyVerified,
      formId
    });

    // Build query
    let query = supabase
      .from('testimonials')
      .select('*')
      .eq('website_id', websiteId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    // Apply filters
    if (formId) {
      query = query.eq('form_id', formId);
    }

    if (minRating && minRating > 0) {
      query = query.gte('rating', minRating);
    }

    if (onlyVerified) {
      query = query.eq('metadata->>verified_purchase', true);
    }

    const { data: testimonials, error } = await query;

    if (error) {
      console.error('[sync-testimonials] Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by media type if specified
    let filteredTestimonials = testimonials || [];
    if (mediaFilter && mediaFilter !== 'all') {
      filteredTestimonials = filteredTestimonials.filter(t => {
        switch (mediaFilter) {
          case 'text_only':
            return !t.image_url && !t.video_url;
          case 'with_image':
            return !!t.image_url;
          case 'with_video':
            return !!t.video_url;
          default:
            return true;
        }
      });
    }

    // Transform to canonical event format
    const canonicalEvents = filteredTestimonials.map((testimonial: any) => {
      const createdAt = testimonial.created_at || new Date().toISOString();
      const rating = testimonial.rating || 5;
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      
      // Calculate relative time
      const now = new Date();
      const then = new Date(createdAt);
      const diffMs = now.getTime() - then.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      let timeAgo = 'just now';
      if (diffMins >= 1 && diffMins < 60) {
        timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      } else if (diffMins >= 60 && diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffMins >= 1440 && diffMins < 10080) {
        const days = Math.floor(diffMins / 1440);
        timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
      } else if (diffMins >= 10080) {
        const weeks = Math.floor(diffMins / 10080);
        if (weeks <= 4) {
          timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = then.toLocaleDateString();
        }
      }

      return {
        event_id: `testimonial_${testimonial.id}`,
        provider: 'testimonials',
        provider_event_type: 'testimonial_submitted',
        timestamp: createdAt,
        payload: testimonial,
        normalized: {
          'template.author_name': testimonial.author_name,
          'template.author_email': testimonial.author_email,
          'template.author_avatar': testimonial.author_avatar_url,
          'template.rating': rating,
          'template.rating_stars': stars,
          'template.message': testimonial.message,
          'template.image_url': testimonial.image_url,
          'template.video_url': testimonial.video_url,
          'template.time_ago': timeAgo,
          'template.verified': !!testimonial.metadata?.verified_purchase,
          'meta.source': testimonial.source || 'form',
          'meta.status': testimonial.status || 'pending',
        },
      };
    });

    console.log(`[sync-testimonials] Returning ${canonicalEvents.length} testimonials`);

    return new Response(
      JSON.stringify({ 
        success: true,
        events: canonicalEvents,
        count: canonicalEvents.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-testimonials] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
