import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const url = new URL(req.url);
    const widgetId = url.pathname.split('/').pop();

    if (!widgetId) {
      return new Response(JSON.stringify({ error: 'Widget ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Fetch widget events
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('widget_id', widgetId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      if (body.action === 'track') {
        // Track view or click
        const { error } = await supabase
          .from('events')
          .update({
            views: body.type === 'view' ? supabase.rpc('increment_views') : undefined,
            clicks: body.type === 'click' ? supabase.rpc('increment_clicks') : undefined,
          })
          .eq('id', body.eventId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.action === 'create') {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert({
            widget_id: widgetId,
            event_type: body.event_type || 'notification',
            event_data: body.event_data,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ event: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Widget API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});