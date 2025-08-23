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

    // Routes: /functions/v1/widget-api/api/widgets/:id or /widget-api/api/widgets/:id/events or visitor-session
    // Handle both direct widget-api calls and functions/v1/widget-api calls
    const isDirectCall = pathParts[1] === 'api' && pathParts[2] === 'widgets';
    const isFunctionCall = pathParts[1] === 'functions' && pathParts[2] === 'v1' && pathParts[3] === 'widget-api' && pathParts[4] === 'api' && pathParts[5] === 'widgets';
    
    if (isDirectCall && pathParts.length >= 4) {
      const widgetId = pathParts[3];
      const subPath = pathParts[4];
      console.log('Widget API diagnostics (direct):', { pathParts, widgetId, subPath });
      
      // Handle visitor session tracking
      if (subPath === 'visitor-session' && req.method === 'POST') {
        const body = await req.json();
        const { session_id, page_url, user_agent, referrer } = body;
        
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

        // Get client IP with GDPR compliance (anonymized)
        const fullIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
        const anonymizedIp = fullIp ? fullIp.split('.').slice(0, 3).join('.') + '.0' : ''; // Anonymize last octet

        // Upsert visitor session
        const { error: sessionError } = await supabase
          .from('visitor_sessions')
          .upsert({
            widget_id: widgetId,
            session_id,
            page_url,
            user_agent: user_agent || '',
            ip_address: anonymizedIp,
            is_active: true,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'widget_id,session_id'
          });

        if (sessionError) {
          console.error('Error tracking visitor session:', sessionError);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (subPath === 'events') {
        if (req.method === 'GET') {
          // First get the widget to check notification types
          const { data: widget, error: widgetError } = await supabase
            .from('widgets')
            .select('id, notification_types, user_id')
            .eq('id', widgetId)
            .single();

          if (widgetError || !widget) {
            return new Response(
              JSON.stringify({ error: 'Widget not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Get allowed event types based on notification types
          const notificationTypes = widget.notification_types || [];
          let eventTypeFilter = '';
          
          if (notificationTypes.length > 0) {
            // Map notification types to event types
            const allowedEventTypes = new Set<string>();
            
            // Notification type to event type mapping
            const notificationEventMapping: Record<string, string[]> = {
              'recent-purchase': ['purchase', 'conversion'],
              'live-visitors': ['view', 'visitor'],
              'contact-form': ['contact', 'conversion'],
              'signup-notification': ['signup'],
              'review-testimonial': ['review'],
              'limited-offer': ['conversion'],
              'stock-alert': ['view'],
              'download-notification': ['download'],
              'booking-appointment': ['booking'],
              'milestone-celebration': ['conversion']
            };
            
            notificationTypes.forEach((typeId: string) => {
              const eventTypes = notificationEventMapping[typeId] || [];
              eventTypes.forEach(eventType => allowedEventTypes.add(eventType));
            });
            
            if (allowedEventTypes.size > 0) {
              const eventTypesArray = Array.from(allowedEventTypes);
              eventTypeFilter = eventTypesArray.map(et => `event_type.eq.${et}`).join(',');
            }
          }

          // Get widget with display rules for event blending
          const { data: widgetData, error: widgetFetchError } = await supabase
            .from('widgets')
            .select('display_rules, user_id')
            .eq('id', widgetId)
            .single();

          if (widgetFetchError || !widgetData) {
            return new Response(
              JSON.stringify({ error: 'Widget configuration not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Get user profile for business type
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_type')
            .eq('id', widgetData.user_id)
            .single();

          const businessType = profile?.business_type || 'saas';
          const displayRules = widgetData.display_rules || {};
          
          // Phase 5: Unified Display Engine with Smart Rotation Logic
          const displayConfig = displayRules.display_engine || {
            natural_ratio: 0.8, // Default 80/20 split
            quick_win_ratio: 0.2,
            auto_graduation: true,
            min_natural_threshold: 10,
            max_quick_wins_per_session: 3,
            prioritize_natural: true
          };

          // Fetch natural events (manual, connector, demo but NOT quick_win)
          let naturalQuery = supabase
            .from('events')
            .select('*')
            .eq('widget_id', widgetId)
            .eq('flagged', false)
            .neq('source', 'quick_win') // Exclude quick-wins from naturals
            .eq('status', 'approved');

          // Apply event type filter for natural events
          if (eventTypeFilter) {
            naturalQuery = naturalQuery.or(eventTypeFilter);
          }

          const { data: naturalEvents, error: naturalError } = await naturalQuery
            .order('created_at', { ascending: false })
            .limit(50);

          // Fetch active quick-win events
          const { data: quickWinEvents, error: quickWinError } = await supabase
            .from('events')
            .select('*')
            .eq('widget_id', widgetId)
            .eq('source', 'quick_win')
            .eq('flagged', false)
            .eq('status', 'approved')
            .or('expires_at.is.null,expires_at.gt.now()')
            .order('created_at', { ascending: false })
            .limit(20);

          if (naturalError || quickWinError) {
            console.error('Error fetching events:', naturalError || quickWinError);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch events' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const allNaturalEvents = naturalEvents || [];
          const allQuickWinEvents = quickWinEvents || [];

          // Phase 5: Smart Rotation Logic
          const requestedCount = 10;
          let selectedEvents: any[] = [];

          if (allNaturalEvents.length === 0) {
            // Fallback: No naturals, show quick-wins only
            selectedEvents = allQuickWinEvents.slice(0, requestedCount);
            console.log('Display Engine: Fallback mode - showing quick-wins only');
          } else if (allNaturalEvents.length >= displayConfig.min_natural_threshold) {
            // Graduation mode: Enough naturals, apply ratio
            const naturalCount = Math.ceil(requestedCount * displayConfig.natural_ratio);
            const quickWinCount = Math.min(
              requestedCount - naturalCount,
              displayConfig.max_quick_wins_per_session,
              allQuickWinEvents.length
            );
            
            selectedEvents = [
              ...allNaturalEvents.slice(0, naturalCount),
              ...allQuickWinEvents.slice(0, quickWinCount)
            ];
            console.log(`Display Engine: Graduation mode - ${naturalCount} naturals, ${quickWinCount} quick-wins`);
          } else {
            // Blending mode: Fill gaps with quick-wins
            const availableNaturals = allNaturalEvents.length;
            const quickWinFillCount = Math.min(
              requestedCount - availableNaturals,
              displayConfig.max_quick_wins_per_session,
              allQuickWinEvents.length
            );
            
            selectedEvents = [
              ...allNaturalEvents,
              ...allQuickWinEvents.slice(0, quickWinFillCount)
            ];
            console.log(`Display Engine: Blending mode - ${availableNaturals} naturals, ${quickWinFillCount} quick-wins`);
          }

          // Shuffle for natural display variation while maintaining source awareness
          const events = selectedEvents
            .sort(() => Math.random() - 0.5)
            .slice(0, requestedCount);

          if (error) {
            console.error('Error fetching events:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch events' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Transform events for widget display using business context
          const transformedEvents = events?.map(event => {
            // Use message_template if available, otherwise generate from business context
            let message = event.message_template;
            
            if (!message && event.business_type && event.user_name && event.user_location) {
              // Generate message based on business context
              const messageData = {
                name: event.user_name,
                location: event.user_location,
                product: event.event_data?.product_name || event.event_data?.service,
                amount: event.event_data?.price || (event.event_data?.amount ? parseFloat(event.event_data.amount.replace(/[^\d.]/g, '')) : undefined),
                service: event.event_data?.service || event.event_data?.product_name,
                count: event.event_data?.quantity || event.event_data?.count
              };
              
              // Use business-specific message generation
              if (event.business_type === 'ecommerce' && event.event_type === 'purchase') {
                message = `${messageData.name} from ${messageData.location} just bought ${messageData.product}${messageData.amount ? ` for $${messageData.amount}` : ''}`;
              } else if (event.business_type === 'saas' && event.event_type === 'signup') {
                message = `${messageData.name} from ${messageData.location} just started a free trial`;
              } else if (event.business_type === 'services' && event.event_type === 'booking') {
                message = `${messageData.name} from ${messageData.location} booked a consultation`;
              }
            }
            
            // Fallback to event_data.message or generic message
            if (!message) {
              message = event.event_data?.message || 'New activity detected';
            }
            
            return {
              id: event.id,
              message: message,
              type: event.event_type,
              created_at: event.created_at
            };
          }).filter(event => event.message && event.message !== 'undefined') || [];

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
            .select('id, status, user_id, display_rules, campaign_id')
            .eq('id', widgetId)
            .eq('status', 'active')
            .single();

          if (widgetError || !widget) {
            console.error('Widget lookup error:', widgetError);
            return new Response(
              JSON.stringify({ error: 'Widget not found or inactive' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Campaign date validation via campaign relationship
          if (widget.campaign_id) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('start_date, end_date, status')
              .eq('id', widget.campaign_id)
              .single();
            
            if (campaign) {
              const now = new Date();
              if (campaign.start_date && now < new Date(campaign.start_date)) {
                return new Response(
                  JSON.stringify({ error: 'Campaign has not started yet' }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              if (campaign.end_date && now > new Date(campaign.end_date)) {
                return new Response(
                  JSON.stringify({ error: 'Campaign has ended' }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
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

          // Strengthened throttling: prevent >3 events per 5s per IP
          if (ip) {
            const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
            const { data: recentFromIp } = await supabase
              .from('events')
              .select('id')
              .eq('widget_id', widgetId)
              .eq('ip', ip)
              .gte('created_at', fiveSecAgo);
            if ((recentFromIp?.length || 0) >= 3) {
              console.log(`Rate limited: Too many events from IP ${ip}`);
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

          // Enhanced geolocation lookup with GDPR compliance (anonymized)
          let geo: Record<string, any> | undefined;
          try {
            if (ip && ip !== '127.0.0.1' && ip !== '::1') {
              // Anonymize IP for geo lookup (remove last octet for privacy)
              const anonymizedIp = ip.split('.').slice(0, 3).join('.') + '.0';
              const geoRes = await fetch(`https://ipapi.co/${anonymizedIp}/json/`, { headers: { 'Accept': 'application/json' } });
              if (geoRes.ok) {
                const g = await geoRes.json();
                // Only store country-level data for GDPR compliance
                geo = { 
                  country: g.country_name, 
                  country_code: g.country, 
                  region: g.region,
                  timezone: g.timezone
                };
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

          // Anti-fake heuristics
          let flagged = false;
          try {
            const dr = (widget as any).display_rules || {};
            // Session-based burst: >3 events in 5s
            if (sessionId) {
              const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
              const { data: recentBySession } = await supabase
                .from('events')
                .select('id, user_agent')
                .eq('widget_id', widgetId)
                .gte('created_at', fiveSecAgo);
              const sessionBursts = (recentBySession || []).filter((e: any) => e.event_data?.session_id === sessionId);
              if (sessionBursts.length >= 3) flagged = true;
              const uaSimilar = (recentBySession || []).filter((e: any) => e.user_agent === userAgent && e.ip === ip);
              if (uaSimilar.length >= 5) flagged = true;
            }
            // Geo allow/deny enforcement
            const allow = Array.isArray(dr.geo_allowlist) && dr.geo_allowlist.length > 0;
            const denyList = Array.isArray(dr.geo_denylist) ? dr.geo_denylist : [];
            const countryCode = geo?.country_code || geo?.country || '';
            if (allow && countryCode) {
              if (!dr.geo_allowlist.includes(countryCode)) flagged = true;
            }
            if (denyList.length > 0 && countryCode && denyList.includes(countryCode)) {
              flagged = true;
            }
          } catch (_) {}


          // Set proper views and clicks based on event type
          let views = 0;
          let clicks = 0;
          
          if (event_type === 'view' || event_type === 'pageview') {
            views = 1;
          } else if (event_type === 'click') {
            clicks = 1;
          }

          const eventInsert = {
            widget_id: widgetId,
            event_type: event_type || 'custom',
            event_data: combinedEventData,
            views,
            clicks,
            ip,
            user_agent: userAgent,
            flagged,
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

          // If verified-only is enabled and the event was flagged, skip fan-out
          const enforceVerifiedOnly = !!((widget as any).display_rules?.enforce_verified_only);
          if (enforceVerifiedOnly && event.flagged) {
            await supabase.from('alerts').insert({
              type: 'webhook_skipped',
              message: 'Skipped webhook fan-out due to flagged event and verified-only mode',
              widget_id: widgetId,
              user_id: (widget as any).user_id,
              context: { event_type, flagged: event.flagged }
            } as any);
            return new Response(
              JSON.stringify({ success: true, event, webhook_skipped: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Fan-out to integration hooks (webhooks)
          const { data: hooks } = await supabase
            .from('integration_hooks')
            .select('id, url, type')
            .eq('user_id', (widget as any).user_id);

          const payload = { widget_id: widgetId, event_type, event_data: combinedEventData, created_at: event.created_at };

          async function postWithRetry(url: string, body: any) {
            const delays = [0, 500, 1500];
            let lastErr: any;
            for (const d of delays) {
              if (d) await new Promise((r) => setTimeout(r, d));
              try {
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                const status = res.status;
                const text = await res.text().catch(() => '');
                await supabase.from('alerts').insert({
                  type: 'webhook_status',
                  message: `Webhook ${status}`,
                  widget_id: widgetId,
                  user_id: (widget as any).user_id,
                  context: { url, status, body: body?.event_type, response: text }
                } as any);
                if (res.ok) return true;
                lastErr = new Error(`Status ${status}`);
              } catch (e) {
                lastErr = e;
              }
            }
            await supabase.from('alerts').insert({
              type: 'webhook_failure',
              message: `Webhook failed: ${lastErr?.message || lastErr}`,
              widget_id: widgetId,
              user_id: (widget as any).user_id,
              context: { url: body?.url, event_type, error: String(lastErr) }
            } as any);
            return false;
          }

          if (hooks && hooks.length > 0) {
            await Promise.allSettled(
              hooks
                .filter((h: any) => ['webhook', 'zapier', 'pabbly'].includes(h.type))
                .map((h: any) => postWithRetry(h.url, payload))
            );
          }

          return new Response(
            JSON.stringify({ success: true, event }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (subPath === 'stats' && req.method === 'GET') {
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
    } else if (isFunctionCall && pathParts.length >= 6) {
      const widgetId = pathParts[6];
      const subPath = pathParts[7];
      console.log('Widget API diagnostics (function call):', { pathParts, widgetId, subPath });
      
      // Handle visitor session tracking
      if (subPath === 'visitor-session' && req.method === 'POST') {
        const body = await req.json();
        const { session_id, page_url, user_agent, referrer } = body;
        
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

        // Get client IP with GDPR compliance (anonymized)
        const fullIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
        const anonymizedIp = fullIp ? fullIp.split('.').slice(0, 3).join('.') + '.0' : ''; // Anonymize last octet

        // Upsert visitor session
        const { error: sessionError } = await supabase
          .from('visitor_sessions')
          .upsert({
            widget_id: widgetId,
            session_id,
            page_url,
            user_agent: user_agent || '',
            ip_address: anonymizedIp,
            is_active: true,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'widget_id,session_id'
          });

        if (sessionError) {
          console.error('Error tracking visitor session:', sessionError);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (subPath === 'events') {
        if (req.method === 'GET') {
          // Get widget events - include manual events, demo events, and approved connector events (reviews)
          const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .eq('widget_id', widgetId)
            .eq('flagged', false)
            .or('source.eq.demo,source.neq.connector,and(source.eq.connector,status.eq.approved)')
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
            .select('id, status, user_id, display_rules, campaign_id')
            .eq('id', widgetId)
            .eq('status', 'active')
            .single();

          if (widgetError || !widget) {
            console.error('Widget lookup error:', widgetError);
            return new Response(
              JSON.stringify({ error: 'Widget not found or inactive' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Campaign date validation via campaign relationship
          if (widget.campaign_id) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('start_date, end_date, status')
              .eq('id', widget.campaign_id)
              .single();
            
            if (campaign) {
              const now = new Date();
              if (campaign.start_date && now < new Date(campaign.start_date)) {
                return new Response(
                  JSON.stringify({ error: 'Campaign has not started yet' }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              if (campaign.end_date && now > new Date(campaign.end_date)) {
                return new Response(
                  JSON.stringify({ error: 'Campaign has ended' }),
                  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
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

          // Strengthened throttling: prevent >3 events per 5s per IP
          if (ip) {
            const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
            const { data: recentFromIp } = await supabase
              .from('events')
              .select('id')
              .eq('widget_id', widgetId)
              .eq('ip', ip)
              .gte('created_at', fiveSecAgo);
            if ((recentFromIp?.length || 0) >= 3) {
              console.log(`Rate limited: Too many events from IP ${ip}`);
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

          // Enhanced geolocation lookup with GDPR compliance (anonymized)
          let geo: Record<string, any> | undefined;
          try {
            if (ip && ip !== '127.0.0.1' && ip !== '::1') {
              // Anonymize IP for geo lookup (remove last octet for privacy)
              const anonymizedIp = ip.split('.').slice(0, 3).join('.') + '.0';
              const geoRes = await fetch(`https://ipapi.co/${anonymizedIp}/json/`, { headers: { 'Accept': 'application/json' } });
              if (geoRes.ok) {
                const g = await geoRes.json();
                // Only store country-level data for GDPR compliance
                geo = { 
                  country: g.country_name, 
                  country_code: g.country, 
                  region: g.region,
                  timezone: g.timezone
                };
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

          // Anti-fake heuristics
          let flagged = false;
          try {
            const dr = (widget as any).display_rules || {};
            // Session-based burst: >3 events in 5s
            if (sessionId) {
              const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
              const { data: recentBySession } = await supabase
                .from('events')
                .select('id, user_agent')
                .eq('widget_id', widgetId)
                .gte('created_at', fiveSecAgo);
              const sessionBursts = (recentBySession || []).filter((e: any) => e.event_data?.session_id === sessionId);
              if (sessionBursts.length >= 3) flagged = true;
              const uaSimilar = (recentBySession || []).filter((e: any) => e.user_agent === userAgent && e.ip === ip);
              if (uaSimilar.length >= 5) flagged = true;
            }
            // Geo allow/deny enforcement
            const allow = Array.isArray(dr.geo_allowlist) && dr.geo_allowlist.length > 0;
            const denyList = Array.isArray(dr.geo_denylist) ? dr.geo_denylist : [];
            const countryCode = geo?.country_code || geo?.country || '';
            if (allow && countryCode) {
              if (!dr.geo_allowlist.includes(countryCode)) flagged = true;
            }
            if (denyList.length > 0 && countryCode && denyList.includes(countryCode)) {
              flagged = true;
            }
          } catch (_) {}


          // Set proper views and clicks based on event type
          let views = 0;
          let clicks = 0;
          
          if (event_type === 'view' || event_type === 'pageview') {
            views = 1;
          } else if (event_type === 'click') {
            clicks = 1;
          }

          const eventInsert = {
            widget_id: widgetId,
            event_type: event_type || 'custom',
            event_data: combinedEventData,
            views,
            clicks,
            ip,
            user_agent: userAgent,
            flagged,
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

          // If verified-only is enabled and the event was flagged, skip fan-out
          const enforceVerifiedOnly = !!((widget as any).display_rules?.enforce_verified_only);
          if (enforceVerifiedOnly && event.flagged) {
            await supabase.from('alerts').insert({
              type: 'webhook_skipped',
              message: 'Skipped webhook fan-out due to flagged event and verified-only mode',
              widget_id: widgetId,
              user_id: (widget as any).user_id,
              context: { event_type, flagged: event.flagged }
            } as any);
            return new Response(
              JSON.stringify({ success: true, event, webhook_skipped: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Fan-out to integration hooks (webhooks)
          const { data: hooks } = await supabase
            .from('integration_hooks')
            .select('id, url, type')
            .eq('user_id', (widget as any).user_id);

          const payload = { widget_id: widgetId, event_type, event_data: combinedEventData, created_at: event.created_at };

          async function postWithRetry(url: string, body: any) {
            const delays = [0, 500, 1500];
            let lastErr: any;
            for (const d of delays) {
              if (d) await new Promise((r) => setTimeout(r, d));
              try {
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                const status = res.status;
                const text = await res.text().catch(() => '');
                await supabase.from('alerts').insert({
                  type: 'webhook_status',
                  message: `Webhook ${status}`,
                  widget_id: widgetId,
                  user_id: (widget as any).user_id,
                  context: { url, status, body: body?.event_type, response: text }
                } as any);
                if (res.ok) return true;
                lastErr = new Error(`Status ${status}`);
              } catch (e) {
                lastErr = e;
              }
            }
            await supabase.from('alerts').insert({
              type: 'webhook_failure',
              message: `Webhook failed: ${lastErr?.message || lastErr}`,
              widget_id: widgetId,
              user_id: (widget as any).user_id,
              context: { url: body?.url, event_type, error: String(lastErr) }
            } as any);
            return false;
          }

          if (hooks && hooks.length > 0) {
            await Promise.allSettled(
              hooks
                .filter((h: any) => ['webhook', 'zapier', 'pabbly'].includes(h.type))
                .map((h: any) => postWithRetry(h.url, payload))
            );
          }

          return new Response(
            JSON.stringify({ success: true, event }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (subPath === 'stats' && req.method === 'GET') {
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