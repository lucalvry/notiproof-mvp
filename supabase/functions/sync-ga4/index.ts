import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refreshGA4Token, isTokenExpired } from '../_shared/ga4-token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GA4Event {
  name: string;
  timestamp: string;
  user_id?: string;
  user_location?: string;
  page_url?: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { campaign_id, user_id, website_id } = await req.json();

    if (!campaign_id || !user_id || !website_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id, user_id, and website_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting GA4 sync for campaign:', campaign_id);

    // Get campaign details with polling config
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, polling_config')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Get polling config
    const pollingConfig = campaign.polling_config || {};
    const maxEventsPerFetch = pollingConfig.max_events_per_fetch || 10;

    // Check user's event quota BEFORE fetching from GA4
    const { data: quotaCheck, error: quotaError } = await supabase
      .rpc('check_event_quota', { 
        _user_id: user_id,
        _events_to_add: maxEventsPerFetch 
      });

    if (quotaError) {
      console.error('Error checking quota:', quotaError);
      throw new Error('Failed to check event quota');
    }

    if (!quotaCheck.allowed) {
      console.log('Quota exceeded for user:', user_id, quotaCheck);
      return new Response(
        JSON.stringify({
          success: false,
          reason: quotaCheck.reason,
          quota_remaining: quotaCheck.quota_remaining,
          quota_limit: quotaCheck.quota_limit,
          events_used: quotaCheck.events_used,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Quota check passed. Remaining:', quotaCheck.quota_remaining);

    // Get GA4 connector
    const { data: connector, error: connectorError } = await supabase
      .from('integration_connectors')
      .select('id, config')
      .eq('website_id', website_id)
      .eq('integration_type', 'ga4')
      .eq('status', 'active')
      .single();

    if (connectorError || !connector) {
      throw new Error('GA4 connector not found or inactive');
    }

    const ga4Config = connector.config as any;
    let accessToken = ga4Config.access_token;
    const refreshToken = ga4Config.refresh_token;
    const tokenExpiresAt = ga4Config.token_expires_at;
    let propertyId = ga4Config.property_id;

    if (!accessToken || !propertyId) {
      throw new Error('GA4 access token or property ID missing');
    }

    // Check if token is expired and refresh if needed
    if (isTokenExpired(tokenExpiresAt)) {
      console.log('Access token expired or expiring soon, refreshing...');
      
      if (!refreshToken) {
        throw new Error('GA4_AUTH_EXPIRED: No refresh token available. Please reconnect GA4 integration.');
      }

      try {
        const refreshResult = await refreshGA4Token(connector.id, refreshToken, ga4Config);
        accessToken = refreshResult.access_token;
        console.log('Token refreshed successfully. New expiry:', refreshResult.expires_at);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error(
          'GA4_AUTH_EXPIRED: Authentication expired and refresh failed. Please reconnect your Google Account in Integrations.'
        );
      }
    }

    // Remove 'properties/' prefix if it exists (GA4 API expects just the numeric ID)
    propertyId = propertyId.replace(/^properties\//, '');

    console.log('Fetching GA4 data for property:', propertyId);

    // Fetch events from GA4 Data API (last 30 minutes)
    const ga4Response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [
            { name: 'eventName' },
            { name: 'pagePath' },
            { name: 'city' },
            { name: 'country' }
          ],
          metrics: [{ name: 'eventCount' }],
          limit: maxEventsPerFetch,
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }]
        }),
      }
    );

    if (!ga4Response.ok) {
      const errorText = await ga4Response.text();
      console.error('GA4 API error:', errorText);
      throw new Error(`Failed to fetch GA4 data: ${errorText}`);
    }

    const ga4Data = await ga4Response.json();
    console.log('GA4 data fetched:', ga4Data.rowCount || 0, 'rows');

    // Transform GA4 events to NotiProof format
    const events: any[] = [];
    const rows = ga4Data.rows || [];

    // Helper: Format URL path for display
    const formatPagePath = (path: string): string => {
      if (path === '/') return 'homepage';
      if (path === '/products') return 'products page';
      if (path === '/pricing') return 'pricing page';
      if (path === '/about') return 'about page';
      if (path === '/contact') return 'contact page';
      if (path === '/blog') return 'blog';
      if (path.startsWith('/blog/')) return 'blog article';
      if (path.startsWith('/products/')) return 'product page';
      if (path.startsWith('/category/')) return 'category page';
      return path.replace(/^\//, '').replace(/-/g, ' ') || 'page';
    };

    // Helper: Get random names for anonymity
    const getRandomName = (): string => {
      const names = [
        'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery',
        'Parker', 'Quinn', 'Reese', 'Sage', 'River', 'Phoenix', 'Skylar', 'Dakota'
      ];
      return names[Math.floor(Math.random() * names.length)];
    };

    for (const row of rows.slice(0, maxEventsPerFetch)) {
      const eventName = row.dimensionValues[0]?.value || 'unknown';
      const pagePath = row.dimensionValues[1]?.value || '/';
      const city = row.dimensionValues[2]?.value || '';
      const country = row.dimensionValues[3]?.value || '';
      const eventCount = parseInt(row.metricValues[0]?.value || '0');

      const location = [city, country].filter(Boolean).join(', ') || 'Unknown';
      const formattedPath = formatPagePath(pagePath);
      const randomName = getRandomName();

      // Map GA4 events to NotiProof event types
      let eventType = 'visitor';
      let messageTemplate = '';

      // Comprehensive GA4 event mapping
      switch (eventName) {
        case 'page_view':
          eventType = 'visitor';
          if (eventCount === 1) {
            messageTemplate = `${randomName} from ${location} is viewing ${formattedPath}`;
          } else {
            messageTemplate = `${eventCount} people are browsing your site`;
          }
          break;

        case 'session_start':
          eventType = 'visitor';
          messageTemplate = `${randomName} from ${location} just started a session`;
          break;

        case 'first_visit':
          eventType = 'visitor';
          messageTemplate = `${randomName} from ${location} is visiting for the first time!`;
          break;

        case 'user_engagement':
          eventType = 'engagement';
          messageTemplate = `${randomName} from ${location} is actively engaging on ${formattedPath}`;
          break;

        case 'scroll':
          eventType = 'engagement';
          messageTemplate = `${randomName} from ${location} scrolled through ${formattedPath}`;
          break;

        case 'click':
          eventType = 'engagement';
          messageTemplate = `${randomName} from ${location} clicked on ${formattedPath}`;
          break;

        case 'purchase':
        case 'begin_checkout':
          eventType = 'purchase';
          messageTemplate = `${randomName} from ${location} just made a purchase`;
          break;

        case 'add_to_cart':
          eventType = 'conversion';
          messageTemplate = `${randomName} from ${location} added an item to cart`;
          break;

        case 'sign_up':
        case 'generate_lead':
          eventType = 'conversion';
          messageTemplate = `${randomName} from ${location} just signed up!`;
          break;

        case 'login':
          eventType = 'engagement';
          messageTemplate = `${randomName} from ${location} just logged in`;
          break;

        case 'search':
          eventType = 'engagement';
          messageTemplate = `${randomName} from ${location} is searching your site`;
          break;

        case 'video_start':
          eventType = 'engagement';
          messageTemplate = `${randomName} from ${location} started watching a video`;
          break;

        case 'file_download':
          eventType = 'conversion';
          messageTemplate = `${randomName} from ${location} downloaded a file`;
          break;

        default:
          // For unknown events, create a generic but friendly message
          const friendlyEventName = eventName.replace(/_/g, ' ').toLowerCase();
          if (eventCount === 1) {
            messageTemplate = `${randomName} from ${location} ${friendlyEventName}`;
          } else {
            messageTemplate = `${eventCount} people ${friendlyEventName}`;
          }
      }

      events.push({
        event_type: eventType,
        message_template: messageTemplate,
        user_location: location,
        page_url: pagePath,
        event_data: {
          ga4_event_name: eventName,
          event_count: eventCount,
          source: 'ga4',
          product_name: eventName === 'page_view' ? formattedPath : null,
          product_url: pagePath && pagePath !== '/' ? `https://${website_id}${pagePath}` : null,
        },
        source: 'connector',
        integration_type: 'ga4',
        status: 'approved',
      });
    }

    console.log('Transformed', events.length, 'events');

    // Get widget for this campaign
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id')
      .eq('campaign_id', campaign_id)
      .single();

    if (widgetError || !widget) {
      throw new Error('Widget not found for campaign');
    }

    // Insert events into database
    let insertedCount = 0;
    if (events.length > 0) {
      const eventsToInsert = events.map(event => ({
        ...event,
        widget_id: widget.id,
        website_id: website_id,
      }));

      const { error: insertError } = await supabase
        .from('events')
        .insert(eventsToInsert);

      if (insertError) {
        console.error('Error inserting events:', insertError);
      } else {
        insertedCount = events.length;
        console.log('Successfully inserted', insertedCount, 'events');

        // Increment usage counter
        const { error: usageError } = await supabase
          .rpc('increment_event_usage', {
            _user_id: user_id,
            _events_count: insertedCount
          });

        if (usageError) {
          console.error('Error incrementing usage:', usageError);
        }
      }
    }

    // Update campaign's last poll time
    await supabase
      .from('campaigns')
      .update({
        polling_config: {
          ...pollingConfig,
          last_poll_at: new Date().toISOString(),
        }
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        events_synced: insertedCount,
        quota_remaining: quotaCheck.quota_remaining - insertedCount,
        next_poll_available: new Date(Date.now() + (pollingConfig.interval_minutes || 5) * 60000).toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('GA4 sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
