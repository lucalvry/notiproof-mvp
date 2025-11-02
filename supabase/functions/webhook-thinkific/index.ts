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

    const body = await req.json();
    const url = new URL(req.url);
    const websiteId = url.searchParams.get('website_id');

    if (!websiteId) {
      return new Response(JSON.stringify({ error: 'website_id parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: widgets } = await supabase
      .from('widgets')
      .select('id, user_id')
      .eq('website_id', websiteId)
      .limit(1);

    if (!widgets || widgets.length === 0) {
      return new Response(JSON.stringify({ error: 'No widget found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const widget = widgets[0];
    const eventType = body.event || body.topic;

    let eventData: any = null;

    if (eventType === 'enrollment.created' || eventType === 'user.enrolled') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: body.user?.name || body.user?.email?.split('@')[0],
        user_email: body.user?.email,
        message_template: `${body.user?.name || 'Someone'} just enrolled in ${body.course?.name || 'a course'}`,
        event_data: {
          course_name: body.course?.name,
          course_id: body.course?.id,
        },
        source: 'integration',
        integration_type: 'thinkific',
        moderation_status: 'approved',
      };
    } else if (eventType === 'course.completed' || eventType === 'user.course_completed') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: body.user?.name || body.user?.email?.split('@')[0],
        message_template: `${body.user?.name || 'Someone'} completed ${body.course?.name || 'a course'}`,
        event_data: {
          course_name: body.course?.name,
          course_id: body.course?.id,
        },
        source: 'integration',
        integration_type: 'thinkific',
        moderation_status: 'approved',
      };
    }

    if (eventData) {
      const { error: insertError } = await supabase.from('events').insert(eventData);
      
      if (insertError) {
        console.error('Error inserting event:', insertError);
        throw insertError;
      }

      await supabase.from('integration_logs').insert({
        integration_type: 'thinkific',
        action: eventType,
        status: 'success',
        user_id: widget.user_id,
        details: { event_type: eventType },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Thinkific Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
