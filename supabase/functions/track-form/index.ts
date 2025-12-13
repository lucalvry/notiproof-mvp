import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiting
const rateLimitCache = new Map<string, { count: number; reset: number }>();

function checkRateLimit(key: string, maxRequests: number, windowSeconds: number) {
  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (cached && cached.reset > now) {
    if (cached.count >= maxRequests) {
      return { allowed: false, remaining: 0, reset: cached.reset };
    }
    cached.count++;
    return { allowed: true, remaining: maxRequests - cached.count, reset: cached.reset };
  }

  const reset = now + windowSeconds * 1000;
  rateLimitCache.set(key, { count: 1, reset });
  return { allowed: true, remaining: maxRequests - 1, reset };
}

// Parse bracket notation keys like "form_fields[name]" → { name: value }
function flattenBracketNotation(data: Record<string, any>): Record<string, any> {
  const flattened: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Match patterns like "form_fields[name]" or "fields[email]"
    const bracketMatch = key.match(/\[([^\]]+)\]$/);
    if (bracketMatch) {
      const innerKey = bracketMatch[1].toLowerCase();
      flattened[innerKey] = value;
    }
    // Also add the original key (lowercase)
    flattened[key.toLowerCase()] = value;
  }
  return flattened;
}

// Extract user name from various field patterns
function extractUserName(sanitizedData: Record<string, any>, flattened: Record<string, any>): string | null {
  return sanitizedData.name || 
    flattened.name || 
    sanitizedData.full_name || 
    flattened.full_name ||
    flattened.fullname ||
    sanitizedData.first_name || 
    flattened.first_name ||
    flattened.firstname ||
    flattened.your_name ||
    flattened['your-name'] ||
    null;
}

// Extract user email from various field patterns
function extractUserEmail(sanitizedData: Record<string, any>, flattened: Record<string, any>): string | null {
  return sanitizedData.email || 
    flattened.email || 
    flattened.your_email ||
    flattened['your-email'] ||
    flattened.mail ||
    null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      campaign_id, 
      integration_id, // NEW: Support integration_id from integration_connectors
      website_id,
      form_data,
      page_url 
    } = await req.json()

    // Rate limit: 100 form submissions per hour per website
    const rateLimitKey = `track-form:${website_id}`;
    const rateLimit = checkRateLimit(rateLimitKey, 100, 3600);

    if (!rateLimit.allowed) {
      console.log('[track-form] Rate limit exceeded for website:', website_id);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((rateLimit.reset - Date.now()) / 1000)
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString()
        }
      });
    }

    // Validate form data size
    const MAX_FIELD_LENGTH = 500;
    const MAX_FIELDS = 50;

    if (Object.keys(form_data).length > MAX_FIELDS) {
      return new Response(JSON.stringify({ error: 'Too many form fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[track-form] Processing form submission:', { campaign_id, integration_id, website_id, page_url })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let nativeConfig: any = null;
    let widgetId: string | null = null;

    // Support both integration_id (new) and campaign_id (legacy)
    if (integration_id) {
      // NEW: Fetch config from integration_connectors
      const { data: integration, error: integrationError } = await supabase
        .from('integration_connectors')
        .select('config, website_id, user_id')
        .eq('id', integration_id)
        .single()

      if (integrationError || !integration) {
        console.error('[track-form] Integration not found:', integrationError)
        return new Response(JSON.stringify({ error: 'Integration not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      nativeConfig = integration.config as any;
      
      // Find the campaign that uses this integration (via data_sources)
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('id, data_sources')
        .eq('website_id', website_id);
      
      // Find campaign where data_sources contains this integration_id (form_hook provider)
      let campaignId: string | null = null;
      for (const camp of (allCampaigns || [])) {
        const sources = Array.isArray(camp.data_sources) ? camp.data_sources : [];
        const hasIntegration = sources.some((ds: any) => 
          ds.provider === 'form_hook' && ds.integration_id === integration_id
        );
        if (hasIntegration) {
          campaignId = camp.id;
          break;
        }
      }
      
      console.log('[track-form] Found campaign for integration:', { integration_id, campaignId });
      
      // Get the widget for the SPECIFIC campaign that uses this integration
      if (campaignId) {
        const { data: campaignWidget } = await supabase
          .from('widgets')
          .select('id')
          .eq('campaign_id', campaignId)
          .single();
        
        widgetId = campaignWidget?.id || null;
        console.log('[track-form] Found campaign widget:', { campaignId, widgetId });
      }
      
      // Fallback: get any widget for website (legacy behavior)
      if (!widgetId) {
        const { data: fallbackWidget } = await supabase
          .from('widgets')
          .select('id')
          .eq('website_id', website_id)
          .limit(1)
          .single();
        widgetId = fallbackWidget?.id || null;
        console.log('[track-form] Using fallback widget:', widgetId);
      }
      
      console.log('[track-form] Using integration config:', { integration_id, widgetId });
    } else if (campaign_id) {
      // LEGACY: Fetch from campaigns table
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('native_config, user_id')
        .eq('id', campaign_id)
        .single()

      if (campaignError || !campaign) {
        console.error('[track-form] Campaign not found:', campaignError)
        return new Response(JSON.stringify({ error: 'Campaign not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      nativeConfig = campaign.native_config as any;
      
      // Get the widget for this specific campaign
      const { data: campaignWidget } = await supabase
        .from('widgets')
        .select('id')
        .eq('campaign_id', campaign_id)
        .single();
      
      widgetId = campaignWidget?.id || campaign_id; // Use campaign widget or fallback to campaign_id
      
      console.log('[track-form] Using legacy campaign config:', { campaign_id, widgetId });
    } else {
      return new Response(JSON.stringify({ error: 'Either integration_id or campaign_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If still no widget, create a fallback
    if (!widgetId) {
      const { data: anyWidget } = await supabase
        .from('widgets')
        .select('id')
        .eq('website_id', website_id)
        .limit(1)
        .single();
      widgetId = anyWidget?.id;
    }

    if (!widgetId) {
      console.error('[track-form] No widget found for website:', website_id);
      return new Response(JSON.stringify({ error: 'No widget found for website' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // 2. Sanitize form data (remove sensitive fields and truncate long values)
    const sensitiveFields = ['password', 'credit_card', 'cvv', 'ssn', 'card_number', 'cardnumber', 'card-number']
    const sanitizedData = Object.fromEntries(
      Object.entries(form_data)
        .filter(([key]) => !sensitiveFields.some(field => key.toLowerCase().includes(field)))
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH) : value
        ])
    )

    console.log('[track-form] Sanitized form data fields:', Object.keys(sanitizedData))

    // 3. Flatten bracket notation and extract fields
    const flattened = flattenBracketNotation(sanitizedData);
    console.log('[track-form] Flattened form data fields:', Object.keys(flattened));
    
    // 4. Extract location, name, and email using helper functions
    const location = sanitizedData.city || flattened.city || sanitizedData.location || flattened.location || sanitizedData.state || flattened.state || 'Unknown'
    const userName = extractUserName(sanitizedData, flattened);
    const userEmail = extractUserEmail(sanitizedData, flattened);
    
    console.log('[track-form] Extracted userName:', userName, 'userEmail:', userEmail);

    // 5. Build message from template
    let message = nativeConfig.message_template || `${userName || 'Someone'} just submitted a form`
    
    // Replace variables in message
    Object.entries(sanitizedData).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
    })

    // 6. Create event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        widget_id: widgetId, // Use proper widget_id
        website_id: website_id,
        event_type: 'form_capture',
        source: 'tracking',
        event_data: {
          ...sanitizedData,
          flattened_fields: flattened,
          page_url,
          auto_detected: true,
          integration_id: integration_id || null
        },
        user_name: userName,
        user_email: userEmail,
        user_location: location,
        page_url: page_url,
        message_template: message,
        status: nativeConfig?.require_moderation ? 'pending' : 'approved',
        moderation_status: nativeConfig?.require_moderation ? 'pending' : 'approved'
      })
      .select()
      .single()

    if (error) {
      console.error('[track-form] Error creating event:', error)
      throw error
    }

    console.log('[track-form] Event created successfully:', event.id)

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[track-form] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
