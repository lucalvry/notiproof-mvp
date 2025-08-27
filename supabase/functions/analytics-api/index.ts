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

    console.log(`Analytics API: ${req.method} ${url.pathname}`);

    // Route: /analytics-api/api/analytics/widgets/:id/summary
    if (pathParts.length >= 6 && 
        pathParts[1] === 'api' && 
        pathParts[2] === 'analytics' && 
        pathParts[3] === 'widgets' && 
        pathParts[5] === 'summary') {
      
      const widgetId = pathParts[4];
      const range = url.searchParams.get('range') || '7d';
      
      // Parse range parameter
      let daysBack = 7;
      if (range.endsWith('d')) {
        daysBack = parseInt(range.slice(0, -1));
      }
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      try {
        // Get aggregated analytics data
        const [impressionsResult, clicksResult, eventsResult] = await Promise.all([
          // Widget impressions
          supabase
            .from('widget_impressions')
            .select('id')
            .eq('widget_id', widgetId)
            .gte('created_at', startDate.toISOString()),
          
          // Heatmap clicks
          supabase
            .from('heatmap_clicks')
            .select('id')
            .eq('widget_id', widgetId)
            .gte('created_at', startDate.toISOString()),
          
          // Events generated
          supabase
            .from('events')
            .select('id, event_type, source, views, clicks')
            .eq('widget_id', widgetId)
            .gte('created_at', startDate.toISOString())
        ]);

        const impressions = impressionsResult.data?.length || 0;
        const clicks = clicksResult.data?.length || 0;
        const events = eventsResult.data || [];
        
        // Calculate totals
        const totalViews = events.reduce((sum, event) => sum + (event.views || 0), 0);
        const totalEventClicks = events.reduce((sum, event) => sum + (event.clicks || 0), 0);
        
        // Group by source
        const eventsBySource = events.reduce((acc, event) => {
          const source = event.source || 'unknown';
          if (!acc[source]) acc[source] = 0;
          acc[source]++;
          return acc;
        }, {} as Record<string, number>);

        // Group by type
        const eventsByType = events.reduce((acc, event) => {
          const type = event.event_type || 'unknown';
          if (!acc[type]) acc[type] = 0;
          acc[type]++;
          return acc;
        }, {} as Record<string, number>);

        const summary = {
          widget_id: widgetId,
          period: `${daysBack}d`,
          period_start: startDate.toISOString(),
          period_end: new Date().toISOString(),
          metrics: {
            impressions,
            clicks,
            total_events: events.length,
            total_views: totalViews,
            total_event_clicks: totalEventClicks,
            ctr: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : '0.00'
          },
          breakdown: {
            by_source: eventsBySource,
            by_type: eventsByType
          }
        };

        return new Response(
          JSON.stringify(summary),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300, s-maxage=600'
            }
          }
        );
      } catch (error) {
        console.error('Analytics summary error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to generate analytics summary' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Default response
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analytics API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});