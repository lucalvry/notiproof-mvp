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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Remove 'widget-api' from path if present (for Supabase function URLs)
    const adjustedParts = pathParts[0] === 'widget-api' ? pathParts.slice(1) : pathParts;
    
    const [resource, identifier, action] = adjustedParts;

    // GET /events/:widgetId - Fetch approved events
    if (req.method === 'GET' && resource === 'events' && identifier) {
      const { data: widget, error: widgetError } = await supabase
        .from('widgets')
        .select('id, status, display_rules, allowed_event_sources')
        .eq('id', identifier)
        .single();

      if (widgetError || !widget || widget.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Widget not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const allowedSources = widget.allowed_event_sources || ['natural', 'integration', 'quick-win'];

      const { data: events, error } = await supabase
        .from('events')
        .select('id, event_type, message_template, user_name, user_location, created_at, event_data')
        .eq('widget_id', identifier)
        .eq('moderation_status', 'approved')
        .in('source', allowedSources)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /events/:eventId/view - Track event view
    if (req.method === 'POST' && resource === 'events' && action === 'view' && identifier) {
      await supabase.rpc('increment_event_counter', {
        event_id: identifier,
        counter_type: 'views'
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /events/:eventId/click - Track event click
    if (req.method === 'POST' && resource === 'events' && action === 'click' && identifier) {
      await supabase.rpc('increment_event_counter', {
        event_id: identifier,
        counter_type: 'clicks'
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /verify/:widgetId - Verify widget exists and is active
    if (req.method === 'GET' && resource === 'verify' && identifier) {
      const { data: widget, error } = await supabase
        .from('widgets')
        .select('id, status, name')
        .eq('id', identifier)
        .single();

      if (error || !widget) {
        return new Response(JSON.stringify({ verified: false }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ verified: widget.status === 'active', widget }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /sessions - Track visitor session
    if (req.method === 'POST' && resource === 'sessions') {
      const body = await req.json();
      const { widget_id, session_id, page_url, user_agent, ip_address } = body;

      const { error } = await supabase.from('visitor_sessions').upsert({
        widget_id,
        session_id,
        page_url,
        user_agent,
        ip_address,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'session_id'
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Widget API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
