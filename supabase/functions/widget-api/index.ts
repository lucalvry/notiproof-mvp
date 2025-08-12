import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Widget API: ${req.method} ${url.pathname}`);

    // Health check endpoint
    if (pathParts.length === 3 && pathParts[1] === 'api' && pathParts[2] === 'health') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Routes: /widget-api/api/widgets/:id or /widget-api/api/widgets/:id/events
    if (pathParts.length >= 4 && pathParts[1] === 'api' && pathParts[2] === 'widgets') {
      const widgetId = pathParts[3];
      console.log('Widget API diagnostics:', { pathParts, widgetId });
      if (pathParts[4] === 'events') {
        if (req.method === 'GET') {
          // Get widget events
          const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('widget_id', widgetId)
            .eq('flagged', false)
            .order('created_at', { ascending: false })
            .limit(10);

          if (error) {
            console.error('Error fetching events:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch events' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Transform events for widget display - only return events with proper messages
          const transformedEvents = events?.filter(event => 
            event.event_data?.message && event.event_data.message !== 'undefined'
          ).map(event => ({
            id: event.id,
            message: event.event_data.message,
            type: event.event_type,
            created_at: event.created_at
          })) || [];

          return new Response(
            JSON.stringify(transformedEvents),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (req.method === 'POST') {
          // Create widget event
          const body = await req.json();
          console.log('Widget API POST body:', JSON.stringify(body, null, 2));
          const { event_type, event_data, metadata } = body;
          const diagSessionId = (event_data?.session_id) || (metadata?.session_id);
          console.log('Widget API event diagnostics:', { widgetId, event_type, session_id: diagSessionId });

          // Verify widget exists and is active
          const { data: widget, error: widgetError } = await supabase
            .from('widgets')
            .select('id, status')
            .eq('id', widgetId)
            .eq('status', 'active')
            .single();

          if (widgetError || !widget) {
            return new Response(
              JSON.stringify({ error: 'Widget not found or inactive' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Basic request metadata
          const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
          const userAgent = req.headers.get('user-agent') || '';

          // Rate limiting for clicks - check for duplicate clicks within 2 seconds (by session)
          const sessionId = metadata?.session_id || event_data?.session_id;
          if (event_type === 'click' && sessionId) {
            const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
            const { data: recentClicks } = await supabase
              .from('events')
              .select('id, event_data')
              .eq('widget_id', widgetId)
              .eq('event_type', 'click')
              .gte('created_at', twoSecondsAgo);

            const duplicateClick = recentClicks?.find(click => 
              click.event_data?.session_id === sessionId
            );

            if (duplicateClick) {
              console.log(`Rate limited: Duplicate click from session ${sessionId}`);
              return new Response(
                JSON.stringify({ success: true, message: 'Event deduplicated' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          // Simple IP-based throttling: prevent >1 event per IP within 1 second per widget
          if (ip) {
            const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
            const { data: recentFromIp, error: ipQueryError } = await supabase
              .from('events')
              .select('id')
              .eq('widget_id', widgetId)
              .eq('ip', ip)
              .gte('created_at', oneSecondAgo)
              .limit(1);
            if (!ipQueryError && recentFromIp && recentFromIp.length > 0) {
              console.log(`Rate limited: Rapid events from IP ${ip}`);
              return new Response(
                JSON.stringify({ success: true, message: 'Throttled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          // Merge event_data and metadata with derived fields below
          // Track the event with proper values for views, clicks, and conversions
          // Derive basic device type
          const device = /Mobi|Android|iPhone|iPad|Tablet/i.test(userAgent) ? 'mobile' : 'desktop';

          // Optional geolocation lookup (best-effort)
          let geo: Record<string, any> | undefined;
          try {
            if (ip && ip !== '127.0.0.1' && ip !== '::1') {
              const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { headers: { 'Accept': 'application/json' } });
              if (geoRes.ok) {
                const g = await geoRes.json();
                geo = { country: g.country_name, country_code: g.country, city: g.city, region: g.region, latitude: g.latitude, longitude: g.longitude };
              }
            }
          } catch (_) {
            // ignore geo failures
          }

          const combinedEventData = {
            ...event_data,
            ...metadata,
            timestamp: new Date().toISOString(),
            device,
            geo,
          };

          const eventInsert = {
            widget_id: widgetId,
            event_type: event_type || 'custom',
            event_data: combinedEventData,
            views: event_type === 'view' ? 1 : 0,
            clicks: event_type === 'click' ? 1 : 0,
            ip,
            user_agent: userAgent,
          };

          const { data: event, error: eventError } = await supabase
            .from('events')
            .insert(eventInsert)
            .select()
            .single();

          if (eventError) {
            console.error('Error creating event:', eventError);
            return new Response(
              JSON.stringify({ error: 'Failed to create event' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Event tracked: ${event_type} for widget ${widgetId} ${metadata?.session_id ? `(session: ${metadata.session_id})` : ''}`);

          return new Response(
            JSON.stringify({ success: true, event }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (pathParts[4] === 'stats' && req.method === 'GET') {
        // Return aggregate stats for a widget
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // All-time views/clicks (may be heavy for very large datasets; acceptable for MVP)
        const { data: allEvents, error: allErr } = await supabase
          .from('events')
          .select('views, clicks')
          .eq('widget_id', widgetId);
        if (allErr) {
          console.error('Error fetching all-time stats:', allErr);
          return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const totalViews = (allEvents || []).reduce((s, e) => s + (e.views || 0), 0);
        const totalClicks = (allEvents || []).reduce((s, e) => s + (e.clicks || 0), 0);
        const totalEvents = (allEvents || []).length;

        // Last 24h
        const { data: lastDay, error: dayErr, count: lastDayCount } = await supabase
          .from('events')
          .select('*', { count: 'exact' })
          .eq('widget_id', widgetId)
          .gte('created_at', twentyFourHoursAgo);
        if (dayErr) {
          console.error('Error fetching 24h stats:', dayErr);
        }
        const views24h = (lastDay || []).reduce((s, e) => s + (e.views || 0), 0);
        const clicks24h = (lastDay || []).reduce((s, e) => s + (e.clicks || 0), 0);

        return new Response(
          JSON.stringify({
            totalEvents,
            totalViews,
            totalClicks,
            last24h: {
              events: lastDayCount || 0,
              views: views24h,
              clicks: clicks24h,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      
      // Handle widget operations
      if (req.method === 'GET') {
        // Get widget details
        const { data: widget, error } = await supabase
          .from('widgets')
          .select('*')
          .eq('id', widgetId)
          .eq('status', 'active')
          .single();

        if (error || !widget) {
          // Return mock data if widget not found (for testing)
          const mockWidget = {
            id: widgetId,
            name: 'Demo Widget',
            template_name: 'notification-popup',
            status: 'active',
            style_config: {
              position: 'bottom-left',
              delay: 3000,
              color: '#3B82F6',
              showCloseButton: true
            }
          };

          return new Response(
            JSON.stringify(mockWidget),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(widget),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle general widgets endpoint
    if (pathParts.length === 3 && pathParts[1] === 'api' && pathParts[2] === 'widgets') {
      if (req.method === 'GET') {
        // List all active widgets (public endpoint)
        const { data: widgets, error } = await supabase
          .from('widgets')
          .select('id, name, template_name, status, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching widgets:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch widgets' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(widgets || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If no route matches, return 404
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Widget API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});