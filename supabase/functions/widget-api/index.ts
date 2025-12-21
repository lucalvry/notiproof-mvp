import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { checkRateLimit } from './rate-limit.ts';
import { fetchTestimonialEvents } from './testimonial-handler.ts';

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
    
    // Find 'widget-api' in the path and get everything after it
    const widgetApiIndex = pathParts.indexOf('widget-api');
    const adjustedParts = widgetApiIndex !== -1 
      ? pathParts.slice(widgetApiIndex + 1) 
      : pathParts;
    
    const [resource, identifier, action] = adjustedParts;
    
    // Check for playlist mode
    const playlistMode = url.searchParams.get('playlist_mode') === 'true';
    const websiteIdParam = url.searchParams.get('website_id');
    const widgetIdParam = url.searchParams.get('widget_id');
    const siteTokenParam = url.searchParams.get('site_token');
    
    // PHASE 8: Playlist API - Returns active playlist and campaigns
    if (req.method === 'GET' && playlistMode && websiteIdParam) {
      try {
        // Fetch active playlist for website
        const { data: playlist, error: playlistError } = await supabase
          .from('campaign_playlists')
          .select('*')
          .eq('website_id', websiteIdParam)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (playlistError && playlistError.code !== 'PGRST116') {
          console.error('Error fetching playlist:', playlistError);
        }
        
        // Fetch active campaigns for website
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select(`
            id,
            name,
            status,
            data_sources,
            priority,
            frequency_cap,
            schedule,
            display_rules,
            template_id,
            template_mapping
          `)
          .eq('website_id', websiteIdParam)
          .eq('status', 'active');
        
        if (campaignsError) {
          throw campaignsError;
        }
        
        // Filter campaigns by playlist order if available
        let orderedCampaigns = campaigns || [];
        if (playlist && playlist.campaign_order && Array.isArray(playlist.campaign_order) && playlist.campaign_order.length > 0) {
          const orderMap = new Map<string, number>(playlist.campaign_order.map((id: string, index: number) => [id, index]));
          orderedCampaigns = orderedCampaigns.sort((a, b) => {
            const aOrder = orderMap.get(a.id) ?? 999;
            const bOrder = orderMap.get(b.id) ?? 999;
            return aOrder - bOrder;
          });
        }
        
        console.log('[widget-api] Playlist mode response:', {
          playlist_name: playlist?.name,
          campaigns_count: orderedCampaigns.length,
          sequence_mode: playlist?.rules?.sequence_mode
        });
        
        return new Response(JSON.stringify({
          success: true,
          playlist: playlist || null,
          campaigns: orderedCampaigns,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('[widget-api] Playlist mode error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to fetch playlist data',
          details: error?.message || 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

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

      // Fetch user's subscription and check if blocked
      let subscriptionInfo = null;
      let isBlocked = false;
      let blockReason = null;
      
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          status,
          trial_end,
          subscription_plans!inner(name)
        `)
        .eq('user_id', website.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Check subscription status
      if (!subscription) {
        // No subscription = blocked
        isBlocked = true;
        blockReason = 'no_subscription';
      } else {
        const status = subscription.status;
        const trialEnd = subscription.trial_end;
        
        // Check if trial expired
        if (status === 'trialing' && trialEnd && new Date(trialEnd) < new Date()) {
          isBlocked = true;
          blockReason = 'trial_expired';
        } else if (status === 'past_due') {
          isBlocked = true;
          blockReason = 'payment_failed';
        } else if (status === 'cancelled') {
          isBlocked = true;
          blockReason = 'subscription_cancelled';
        } else if (status === 'active' || status === 'trialing') {
          // Valid subscription
          const plans = subscription.subscription_plans as { name: string } | { name: string }[];
          const planName = Array.isArray(plans) ? plans[0]?.name : plans.name;
          if (planName) {
            subscriptionInfo = {
              plan_name: planName,
            };
          }
        } else {
          // Unknown status = blocked
          isBlocked = true;
          blockReason = 'no_subscription';
        }
      }
      
      // If blocked, return empty response with block info
      if (isBlocked) {
        console.log('[widget-api] User blocked:', { user_id: website.user_id, blockReason });
        return new Response(JSON.stringify({
          blocked: true,
          block_reason: blockReason,
          widgets: [],
          events: [],
          campaigns: [],
          display_settings: null,
          message: 'Subscription inactive. Please update your subscription to display notifications.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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

      // Fetch active campaigns with full data for native integrations INCLUDING template HTML
      const { data: activeCampaigns, error: campaignsCheckError } = await supabase
        .from('campaigns')
        .select(`
          id, name, data_sources, native_config, template_id, template_mapping, display_rules,
          templates:template_id (id, name, template_key, html_template, required_fields, style_variant)
        `)
        .eq('website_id', website.id)
        .eq('status', 'active');
      
      // Check if any campaign has native providers
      const hasActiveCampaigns = activeCampaigns && activeCampaigns.some(c => {
        const sources = c.data_sources as any[];
        return sources && sources.some(s => 
          ['instant_capture', 'live_visitors', 'announcements', 'testimonials'].includes(s.provider)
        );
      });

      // Enrich campaigns with integration credentials for live_visitors
      const enrichedCampaigns = [];
      if (activeCampaigns) {
        for (const campaign of activeCampaigns) {
          const sources = campaign.data_sources as any[];
          const liveVisitorSource = sources?.find((s: any) => s.provider === 'live_visitors');
          
          if (liveVisitorSource?.integration_id) {
            // Fetch integration credentials for live_visitors
            const { data: integration } = await supabase
              .from('integrations')
              .select('credentials')
              .eq('id', liveVisitorSource.integration_id)
              .maybeSingle();
            
            // Merge credentials into native_config
            enrichedCampaigns.push({
              ...campaign,
              native_config: {
                ...campaign.native_config,
                ...integration?.credentials,
                mode: integration?.credentials?.mode || 'simulated',
              }
            });
            
            console.log('[widget-api] Enriched live_visitors campaign:', {
              campaign_id: campaign.id,
              integration_id: liveVisitorSource.integration_id,
              has_credentials: !!integration?.credentials
            });
          } else {
            enrichedCampaigns.push(campaign);
          }
        }
      }
      
      console.log('[widget-api] Active campaigns:', {
        total: enrichedCampaigns.length,
        with_live_visitors: enrichedCampaigns.filter(c => 
          (c.data_sources as any[])?.some((s: any) => s.provider === 'live_visitors')
        ).length
      });

      // Fetch form_hook integrations from integration_connectors
      const { data: formHookIntegrations, error: integrationsError } = await supabase
        .from('integration_connectors')
        .select('id, config, status')
        .eq('website_id', website.id)
        .eq('integration_type', 'form_hook')
        .eq('status', 'active');
      
      if (integrationsError) {
        console.error('[widget-api] Error fetching form hook integrations:', integrationsError);
      } else {
        console.log('[widget-api] Found form hook integrations:', formHookIntegrations?.length || 0);
      }

      // Filter out demo events if there are active campaigns
      // PHASE 2: Use Queue Orchestration Layer instead of raw event fetching
      console.log('[widget-api] Calling queue builder for website:', website.id);
      
      const { data: queueResponse, error: queueError } = await supabase.functions.invoke(
        'build-notification-queue',
        {
          body: {
            websiteId: website.id,
            widgetIds: widgetIds,
            targetQueueSize: 15
          }
        }
      );

      let allEvents: any[] = [];
      let queueMetadata: any = {};

      if (queueError) {
        console.error('[widget-api] Queue builder error:', queueError);
        // Fallback to empty events with error metadata
        queueMetadata = { error: 'Queue builder failed' };
      } else {
        allEvents = queueResponse?.events || [];
        queueMetadata = queueResponse?.queue_metadata || {};

        console.log('[widget-api] Queue built successfully:', {
          total_events: allEvents.length,
          distribution: queueMetadata.distribution,
          weights_applied: queueMetadata.weights_applied
        });
      }

      return new Response(JSON.stringify({
        widgets: widgets || [],
        events: allEvents || [],
        campaigns: enrichedCampaigns, // Include enriched campaigns with live_visitors config
        native_integrations: formHookIntegrations || [], // Form capture integrations
        website_id: website.id, // Needed for form tracking
        display_settings: displaySettings,
        visitor_country: visitorCountry,
        white_label: whiteLabelSettings,
        subscription: subscriptionInfo,
        queue_metadata: queueMetadata
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

    // GET /verify - Website verification endpoint with improved error handling
    if (req.method === 'GET' && resource === 'verify') {
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('[verify] No token provided');
        return new Response('/* NotiProof verification script */', {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
        });
      }

      console.log('[verify] Looking up website for token:', token);

      // Add timeout for database query
      const queryPromise = supabase
        .from('websites')
        .select('id, domain, is_verified')
        .eq('verification_token', token)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 8000)
      );

      try {
        const { data: website, error: websiteError } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any;

        if (websiteError || !website) {
          console.log('[verify] Website not found for token:', token, websiteError);
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
            console.error('[verify] Failed to verify website:', updateError);
          } else {
            console.log('[verify] Website verified successfully:', website.domain);
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
      } catch (timeoutError) {
        console.error('[verify] Request timeout or error:', timeoutError);
        return new Response('/* NotiProof: Verification timeout - please try again */', {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
        });
      }
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

      // Generate visitor ID from IP and user agent
      const visitorId = clientIp 
        ? `${clientIp}-${user_agent?.substring(0, 50) || 'unknown'}`.replace(/[^a-zA-Z0-9-]/g, '-')
        : session_id;

      // Extract domain from page_url
      const domain = page_url ? new URL(page_url).hostname : 'unknown';

      return new Response(JSON.stringify({ 
        success: true,
        sessionId: session_id,
        visitorId: visitorId,
        domain: domain,
        timestamp: Date.now()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /campaigns/:campaignId/view - Track campaign view (for Visitors Pulse)
    if (req.method === 'POST' && resource === 'campaigns' && action === 'view' && identifier) {
      console.log('[widget-api] Received campaign view request for:', identifier);
      try {
        const { data, error } = await supabase.rpc('increment_campaign_view', { p_campaign_id: identifier });
        
        if (error) {
          console.error('[widget-api] RPC error for campaign view:', identifier, error);
          throw error;
        }
        
        console.log('[widget-api] Campaign view tracked successfully:', identifier);
        
        return new Response(JSON.stringify({ success: true, campaign_id: identifier }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('[widget-api] Campaign view tracking error:', identifier, err);
        return new Response(JSON.stringify({ success: false, error: err?.message || 'Failed to track view' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // POST /campaigns/:campaignId/click - Track campaign click (for Visitors Pulse)
    if (req.method === 'POST' && resource === 'campaigns' && action === 'click' && identifier) {
      try {
        await supabase.rpc('increment_campaign_click', { p_campaign_id: identifier });
        console.log('[widget-api] Campaign click tracked:', identifier);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('[widget-api] Campaign click tracking error:', err);
        return new Response(JSON.stringify({ success: false, error: 'Failed to track click' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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
