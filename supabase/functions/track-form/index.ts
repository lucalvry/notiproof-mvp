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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      campaign_id, 
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

    console.log('[track-form] Processing form submission:', { campaign_id, website_id, page_url })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get campaign's native config
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

    const nativeConfig = campaign.native_config as any
    
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

    // 3. Extract location from form or use IP
    const location = sanitizedData.city || sanitizedData.location || sanitizedData.state || 'Unknown'
    const userName = sanitizedData.name || sanitizedData.full_name || sanitizedData.first_name || null

    // 4. Build message from template
    let message = nativeConfig.message_template || `${userName || 'Someone'} just submitted a form`
    
    // Replace variables in message
    Object.entries(sanitizedData).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
    })

    // 5. Create event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        widget_id: campaign_id, // Use campaign_id as widget_id for native integrations
        website_id: website_id,
        event_type: 'form_submission',
        source: 'instant_form',
        event_data: {
          ...sanitizedData,
          page_url,
          auto_detected: true
        },
        user_name: userName,
        user_location: location,
        page_url: page_url,
        message_template: message,
        status: nativeConfig.require_moderation ? 'pending' : 'approved',
        moderation_status: nativeConfig.require_moderation ? 'pending' : 'approved'
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
