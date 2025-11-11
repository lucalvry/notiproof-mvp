import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { checkRateLimit } from './rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: Apply rate limiting - 1000 requests per hour per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `widget-api:${clientIp}`;
    
    const rateLimit = await checkRateLimit(rateLimitKey, {
      max_requests: 1000,
      window_seconds: 3600,
    });
    
    if (!rateLimit.allowed) {
      console.log('Rate limit exceeded for IP:', clientIp);
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((rateLimit.reset - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.reset.toString(),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
        }
      });
    }
    
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
      
      // Get client IP for geo-targeting
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                       req.headers.get('x-real-ip') || 
                       null;
      
      // Find website by verification token (siteToken)
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, domain, is_verified, user_id')
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
      
      // Fetch website settings for display rules and limits
      const { data: settings } = await supabase
        .from('website_settings')
        .select('*')
        .eq('website_id', website.id)
        .single();
      
      const displaySettings = settings ? {
        initial_delay: settings.initial_delay ?? 0,
        display_duration: settings.display_duration ?? 5,
        interval: settings.interval ?? 8,
        max_per_page: settings.max_per_page ?? 5,
        max_per_session: settings.max_per_session ?? 20,
        position: settings.position ?? 'bottom-left',
        mobile_position_override: settings.mobile_position_override ?? 'bottom-center',
        animation: settings.animation ?? 'slide',
        pause_after_click: settings.pause_after_click ?? false,
        pause_after_close: settings.pause_after_close ?? false,
        make_clickable: settings.make_clickable ?? true,
        debug_mode: settings.debug_mode ?? false,
        default_rules: settings.default_rules ?? {}
      } : null;
      
      // Geo-targeting: Lookup visitor's country
      let visitorCountry = null;
      if (clientIp && clientIp !== 'unknown') {
        try {
          const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,countryCode`);
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.status === 'success') {
              visitorCountry = geoData.countryCode;
              console.log('Visitor country detected:', visitorCountry, 'for IP:', clientIp);
            }
          }
        } catch (geoError) {
          console.error('Geo-targeting lookup failed:', geoError);
        }
      }
      
      // Fetch white-label settings for the website owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('white_label_settings')
        .eq('id', website.user_id)
        .single();
      
      const whiteLabelSettings = profile?.white_label_settings || {
        enabled: false,
        hide_branding: false,
        custom_logo_url: "",
        custom_colors: { primary: "#667eea", secondary: "#764ba2" },
        custom_domain: "",
        custom_brand_name: ""
      };

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
        return new Response(JSON.stringify({ 
          widgets: [], 
          events: [],
          display_settings: displaySettings,
          visitor_country: visitorCountry,
          white_label: whiteLabelSettings
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch active native integration campaigns first to determine if we should exclude demo events
      const { data: activeCampaigns, error: campaignsCheckError } = await supabase
        .from('campaigns')
        .select('id, data_source')
        .eq('website_id', website.id)
        .eq('status', 'active')
        .in('data_source', ['instant_capture', 'live_visitors', 'announcements']);

      const hasActiveCampaigns = activeCampaigns && activeCampaigns.length > 0;

      // Filter out demo events if there are active campaigns
      let allowedSourcesDefault = ['manual', 'connector', 'tracking', 'woocommerce', 'quick_win'];
      if (!hasActiveCampaigns) {
        // Only include demo events if no active campaigns exist
        allowedSourcesDefault.push('demo');
      }

      // Fetch events for all widgets - use valid DB enum values
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, event_type, message_template, user_name, user_location, created_at, event_data, widget_id')
        .in('widget_id', widgetIds)
        .eq('moderation_status', 'approved')
        .in('source', allowedSourcesDefault)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      // Fetch active native integration campaigns (instant_capture, live_visitors, announcements)
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, data_source, native_config, status, integration_settings')
        .eq('website_id', website.id)
        .eq('status', 'active')
        .in('data_source', ['instant_capture', 'live_visitors', 'announcements']);

      if (campaignsError) {
        console.error('Failed to fetch native campaigns:', campaignsError);
      }

      return new Response(JSON.stringify({ 
        widgets: widgets || [],
        events: events || [],
        campaigns: campaigns || [], // Native integration campaigns
        display_settings: displaySettings,
        visitor_country: visitorCountry,
        white_label: whiteLabelSettings
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
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

      // Map legacy allowed_event_sources to valid DB enum values
      const legacySourceMapping: Record<string, string> = {
        'natural': 'tracking',
        'integration': 'connector',
        'quick-win': 'quick_win'
      };
      
      let allowedSources = widget.allowed_event_sources || [];
      
      // Map legacy names to valid enum values
      const mappedSources = allowedSources.map((source: string) => 
        legacySourceMapping[source] || source
      );
      
      // Deduplicate and validate
      const validSources = [...new Set(mappedSources)].filter((source: unknown): source is string => 
        typeof source === 'string' && ['manual', 'connector', 'tracking', 'demo', 'woocommerce', 'quick_win'].includes(source)
      );

      let query = supabase
        .from('events')
        .select('id, event_type, message_template, user_name, user_location, created_at, event_data')
        .eq('widget_id', identifier)
        .eq('moderation_status', 'approved');
      
      // Only filter by source if we have valid sources
      if (validSources.length > 0) {
        query = query.in('source', validSources);
      }
      
      const { data: events, error } = await query
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
      const { widget_id, site_token, session_id, page_url, user_agent } = body;
      
      let resolvedWidgetId = widget_id;
      
      // If widget_id is missing but site_token is present, resolve widget from website
      if (!resolvedWidgetId && site_token) {
        const { data: website } = await supabase
          .from('websites')
          .select('id')
          .eq('verification_token', site_token)
          .single();
        
        if (!website) {
          return new Response(JSON.stringify({ error: 'Invalid site token' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Find any active widget for this website
        const { data: widget } = await supabase
          .from('widgets')
          .select('id')
          .eq('website_id', website.id)
          .eq('status', 'active')
          .limit(1)
          .single();
        
        if (!widget) {
          return new Response(JSON.stringify({ error: 'No active widget found for site' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        resolvedWidgetId = widget.id;
      }
      
      if (!resolvedWidgetId) {
        return new Response(JSON.stringify({ error: 'Missing widget_id or site_token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get IP from headers
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                       req.headers.get('x-real-ip') || 
                       null;

      const { error } = await supabase.from('visitor_sessions').upsert({
        widget_id: resolvedWidgetId,
        session_id,
        page_url,
        user_agent,
        ip_address: clientIp,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'session_id'
      });

      if (error) {
        console.error('Session tracking error:', error);
        throw error;
      }

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
