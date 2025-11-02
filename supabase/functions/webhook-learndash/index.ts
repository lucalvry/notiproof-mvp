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
    const event = body.event;
    const user = body.user;
    const course = body.course;
    const lesson = body.lesson;

    let eventData: any = null;

    if (event === 'course_enrolled' || event === 'learndash_course_enrolled') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: user?.display_name || user?.user_email?.split('@')[0],
        user_email: user?.user_email,
        message_template: `${user?.display_name || 'Someone'} just enrolled in ${course?.post_title}`,
        event_data: {
          course_id: course?.ID,
          course_title: course?.post_title,
          user_id: user?.ID,
        },
        source: 'integration',
        integration_type: 'learndash',
        moderation_status: 'approved',
      };
    } else if (event === 'course_completed' || event === 'learndash_course_completed') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: user?.display_name,
        message_template: `${user?.display_name || 'Someone'} completed ${course?.post_title}`,
        event_data: {
          course_id: course?.ID,
          course_title: course?.post_title,
          completion_date: new Date().toISOString(),
        },
        source: 'integration',
        integration_type: 'learndash',
        moderation_status: 'approved',
      };
    } else if (event === 'lesson_completed' || event === 'learndash_lesson_completed') {
      eventData = {
        widget_id: widget.id,
        event_type: 'visitor',
        user_name: user?.display_name,
        message_template: `${user?.display_name || 'Someone'} completed a lesson`,
        event_data: {
          lesson_id: lesson?.ID,
          lesson_title: lesson?.post_title,
          course_id: course?.ID,
        },
        source: 'integration',
        integration_type: 'learndash',
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
        integration_type: 'learndash',
        action: event,
        status: 'success',
        user_id: widget.user_id,
        details: { event: event, course_id: course?.ID },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LearnDash Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
