import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache
const cache = new Map<string, { count: number, timestamp: number }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const website_id = url.searchParams.get('website_id');
  const site_token = url.searchParams.get('site_token');

  if (!website_id && !site_token) {
    return new Response(JSON.stringify({ error: 'website_id or site_token required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get website_id from site_token if needed
    let finalWebsiteId = website_id;
    if (site_token) {
      const { data: website } = await supabase
        .from('websites')
        .select('id')
        .eq('verification_token', site_token)
        .single();
      
      if (website) {
        finalWebsiteId = website.id;
      }
    }

    if (!finalWebsiteId) {
      return new Response(JSON.stringify({ count: 0, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get config for cache duration
    const { data: config } = await supabase
      .from('integrations_config')
      .select('config')
      .eq('integration_type', 'ga4')
      .eq('is_active', true)
      .single();

    const cacheDuration = (config?.config?.cache_duration_seconds || 15) * 1000;

    // Check cache
    const cacheKey = `ga4:${finalWebsiteId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return new Response(JSON.stringify({ 
        count: cached.count,
        cached: true,
        timestamp: new Date(cached.timestamp).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get GA4 connector
    const { data: connector } = await supabase
      .from('integration_connectors')
      .select('*')
      .eq('website_id', finalWebsiteId)
      .eq('integration_type', 'ga4')
      .eq('status', 'active')
      .single();

    if (!connector) {
      // No GA4 connected, return 0
      return new Response(JSON.stringify({ 
        count: 0,
        cached: false,
        message: 'GA4 not connected'
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check token expiry
    const tokenExpiresAt = new Date(connector.config.token_expires_at);
    if (tokenExpiresAt < new Date()) {
      // Token expired, try to refresh
      if (!connector.config.refresh_token) {
        return new Response(JSON.stringify({ 
          error: 'Token expired and no refresh token available',
          count: 0 
        }), { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Refresh token logic
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config?.config?.clientId,
          client_secret: config?.config?.clientSecret,
          refresh_token: connector.config.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (!refreshResponse.ok) {
        console.error('Token refresh failed');
        return new Response(JSON.stringify({ error: 'Token refresh failed', count: 0 }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const newTokens = await refreshResponse.json();

      // Update connector with new token
      await supabase
        .from('integration_connectors')
        .update({
          config: {
            ...connector.config,
            access_token: newTokens.access_token,
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
          }
        })
        .eq('id', connector.id);

      connector.config.access_token = newTokens.access_token;
    }

    // Fetch realtime data from GA4
    const realtimeResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${connector.config.property_id}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connector.config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: [{ name: 'activeUsers' }]
        })
      }
    );

    if (!realtimeResponse.ok) {
      const errorText = await realtimeResponse.text();
      console.error('GA4 API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch GA4 realtime data',
        count: 0 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const realtimeData = await realtimeResponse.json();
    const activeUsers = parseInt(realtimeData.rows?.[0]?.metricValues?.[0]?.value || '0');

    // Update cache
    cache.set(cacheKey, { count: activeUsers, timestamp: Date.now() });

    // Log API call
    await supabase.from('integration_logs').insert({
      integration_type: 'ga4',
      action: 'realtime_fetch',
      status: 'success',
      user_id: connector.user_id,
      details: { active_users: activeUsers, website_id: finalWebsiteId }
    });

    return new Response(JSON.stringify({ 
      count: activeUsers,
      cached: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('GA4 realtime error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
