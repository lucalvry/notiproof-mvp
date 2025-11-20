import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestimonialPayload {
  website_id: string;
  author_name: string;
  author_email?: string;
  rating: number;
  message: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: TestimonialPayload = await req.json();

    // Validate required fields
    if (!payload.website_id || !payload.author_name || !payload.message || !payload.rating) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: website_id, author_name, message, rating' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate rating range
    if (payload.rating < 1 || payload.rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify website exists
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', payload.website_id)
      .single();

    if (websiteError || !website) {
      return new Response(
        JSON.stringify({ error: 'Invalid website_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert testimonial
    const { data: testimonial, error: insertError } = await supabase
      .from('testimonials')
      .insert({
        website_id: payload.website_id,
        source: 'api',
        author_name: payload.author_name,
        author_email: payload.author_email || null,
        rating: payload.rating,
        message: payload.message,
        metadata: payload.metadata || {},
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create testimonial' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        testimonial_id: testimonial.id,
        message: 'Testimonial submitted successfully and is pending review'
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
