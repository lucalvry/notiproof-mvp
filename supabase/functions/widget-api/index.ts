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

    // GET /site/:siteToken - Fetch all widgets and events for a website
    if (req.method === 'GET' && resource === 'site' && identifier) {
      const siteToken = identifier;
      
      // Find website by verification token (siteToken)
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, domain, is_verified')
        .eq('verification_token', siteToken)
        .single();

      if (websiteError || !website) {
        return new Response(JSON.stringify({ error: 'Website not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Auto-verify website on first script load
      if (!website.is_verified) {
        await supabase
          .from('websites')
          .update({ 
            is_verified: true,
            last_verification_at: new Date().toISOString()
          })
          .eq('id', website.id);
        
        console.log('Website auto-verified:', website.domain);
      }

      // Get all active widgets for this website
      const { data: widgets, error: widgetsError } = await supabase
        .from('widgets')
        .select('id, name, status, display_rules, allowed_event_sources, campaign_id')
        .eq('website_id', website.id)
        .eq('status', 'active');

      if (widgetsError) throw widgetsError;

      // Get all widget IDs
      const widgetIds = (widgets || []).map(w => w.id);
      
      if (widgetIds.length === 0) {
        return new Response(JSON.stringify({ widgets: [], events: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch events for all widgets
      const allowedSources = ['natural', 'integration', 'quick-win'];
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, event_type, message_template, user_name, user_location, created_at, event_data, widget_id')
        .in('widget_id', widgetIds)
        .eq('moderation_status', 'approved')
        .in('source', allowedSources)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      return new Response(JSON.stringify({ 
        widgets: widgets || [],
        events: events || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /events/:widgetId - Fetch approved events
    if (req.method === 'GET' && resource === 'events' && identifier) {
      const { data: widget, error: widgetError } = await supabase
        .from('widgets')
        .select('id, status, display_rules, allowed_event_sources, campaign_id')
        .eq('id', identifier)
        .single();

      if (widgetError || !widget || widget.status !== 'active') {
        return new Response(JSON.stringify({ error: 'Widget not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate campaign dates if widget has a campaign
      if (widget.campaign_id) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('start_date, end_date, status')
          .eq('id', widget.campaign_id)
          .single();

        if (campaign) {
          const now = new Date().toISOString();
          
          if (campaign.status !== 'active') {
            return new Response(JSON.stringify({ error: 'Campaign is not active' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (campaign.start_date && campaign.start_date > now) {
            return new Response(JSON.stringify({ error: 'Campaign has not started yet' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (campaign.end_date && campaign.end_date < now) {
            return new Response(JSON.stringify({ error: 'Campaign has ended' }), {
              status: 410,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
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

    // GET /verify - Website verification endpoint
    if (req.method === 'GET' && resource === 'verify') {
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new Response('/* NotiProof verification script */', {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
        });
      }

      // Find website by verification token
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, domain, is_verified')
        .eq('verification_token', token)
        .single();

      if (websiteError || !website) {
        console.log('Website not found for token:', token);
        return new Response('/* NotiProof: Invalid verification token */', {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
        });
      }

      // Mark website as verified if not already
      if (!website.is_verified) {
        const { error: updateError } = await supabase
          .from('websites')
          .update({ 
            is_verified: true,
            last_verification_at: new Date().toISOString()
          })
          .eq('id', website.id);

        if (updateError) {
          console.error('Failed to verify website:', updateError);
        } else {
          console.log('Website verified successfully:', website.domain);
        }
      }

      // Return a simple verification script
      const script = `
        /* NotiProof Website Verification Script */
        console.log('NotiProof: Website verified successfully for ${website.domain}');
        window.NotiProofVerified = true;
      `;

      return new Response(script, {
        headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
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

    // GET /active-count - Get active visitor count
    if (req.method === 'GET' && resource === 'active-count') {
      const widgetId = url.searchParams.get('widget_id');
      const siteToken = url.searchParams.get('site_token');
      
      if (siteToken) {
        // Get website from verification token
        const { data: website } = await supabase
          .from('websites')
          .select('id')
          .eq('verification_token', siteToken)
          .single();
        
        if (!website) {
          return new Response(JSON.stringify({ error: 'Invalid site token' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Get active count for entire website
        const { data: countData } = await supabase
          .rpc('get_active_visitor_count_for_site', { _website_id: website.id });
        
        return new Response(JSON.stringify({ 
          count: countData || 0,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else if (widgetId) {
        // Get active count for specific widget
        const { data: countData } = await supabase
          .rpc('get_active_visitor_count', { _widget_id: widgetId });
        
        return new Response(JSON.stringify({ 
          count: countData || 0,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Missing widget_id or site_token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
