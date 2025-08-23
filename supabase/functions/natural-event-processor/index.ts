import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NaturalEventRequest {
  widgetId: string;
  source: 'shopify' | 'woocommerce' | 'stripe' | 'google_reviews' | 'custom_sdk' | 'api' | 'form_hook' | 'javascript_api' | 'webhook';
  eventType: string;
  rawData: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { widgetId, source, eventType, rawData }: NaturalEventRequest = await req.json();

    console.log('Processing natural event:', { widgetId, source, eventType });

    // Normalize the event using the built-in normalization logic
    const normalizedEvent = await normalizeEvent({
      widget_id: widgetId,
      source,
      event_type: eventType,
      raw_data: rawData
    });

    // Store the normalized event
    const { error } = await supabase
      .from('events')
      .insert(normalizedEvent);

    if (error) {
      console.error('Error storing natural event:', error);
      throw error;
    }

    console.log('Successfully processed natural event');

    return new Response(JSON.stringify({ 
      success: true, 
      eventId: normalizedEvent.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing natural event:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Normalize event based on source and type
 */
async function normalizeEvent(rawEvent: any) {
  const normalized: any = {
    widget_id: rawEvent.widget_id,
    event_type: rawEvent.event_type,
    event_data: rawEvent.raw_data,
    integration_type: rawEvent.source,
    moderation_status: 'approved',
    quality_score: 50,
    source: 'natural',
    views: 0,
    clicks: 0
  };

  // Source-specific normalization
  switch (rawEvent.source) {
    case 'shopify':
      normalizeShopifyEvent(rawEvent.raw_data, normalized);
      break;
    case 'woocommerce':
      normalizeWooCommerceEvent(rawEvent.raw_data, normalized);
      break;
    case 'stripe':
      normalizeStripeEvent(rawEvent.raw_data, normalized);
      break;
    case 'google_reviews':
      normalizeGoogleReviewEvent(rawEvent.raw_data, normalized);
      break;
    case 'custom_sdk':
      normalizeCustomSDKEvent(rawEvent.raw_data, normalized);
      break;
    case 'api':
      normalizeAPIEvent(rawEvent.raw_data, normalized);
      break;
    case 'form_hook':
      normalizeFormHookEvent(rawEvent.raw_data, normalized);
      break;
    case 'javascript_api':
      normalizeJavaScriptAPIEvent(rawEvent.raw_data, normalized);
      break;
    default:
      normalizeGenericEvent(rawEvent.raw_data, normalized);
  }

  // Calculate quality score
  calculateQualityScore(normalized);

  return normalized;
}

function normalizeShopifyEvent(data: any, normalized: any) {
  normalized.user_name = data.customer?.first_name || data.billing_address?.first_name;
  normalized.user_email = data.customer?.email || data.email;
  normalized.user_location = extractLocation(
    data.billing_address?.city,
    data.billing_address?.country
  );
  
  normalized.event_data = {
    ...data,
    product_name: data.line_items?.[0]?.name || 'a product',
    amount: data.total_price,
    currency: data.currency
  };
  
  normalized.business_type = 'ecommerce';
  normalized.message_template = '{user_name} from {user_location} just bought {product_name}';
}

function normalizeWooCommerceEvent(data: any, normalized: any) {
  normalized.user_name = `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim();
  normalized.user_email = data.billing?.email;
  normalized.user_location = extractLocation(
    data.billing?.city,
    data.billing?.country
  );
  
  normalized.event_data = {
    ...data,
    product_name: data.line_items?.[0]?.name || 'a product',
    amount: data.total,
    currency: data.currency
  };
  
  normalized.business_type = 'ecommerce';
  normalized.message_template = 'Someone from {user_location} purchased {product_name}';
}

function normalizeStripeEvent(data: any, normalized: any) {
  normalized.user_email = data.customer?.email || data.customer_email;
  normalized.user_name = data.customer?.name || extractNameFromEmail(normalized.user_email);
  
  normalized.event_data = {
    ...data,
    plan_name: data.items?.data?.[0]?.price?.nickname || 'Premium Plan',
    amount: data.items?.data?.[0]?.price?.unit_amount,
    currency: data.currency
  };
  
  normalized.business_type = 'saas';
  normalized.message_template = '{user_name} upgraded to {plan_name}';
}

function normalizeGoogleReviewEvent(data: any, normalized: any) {
  normalized.user_name = data.author_name || 'Someone';
  
  normalized.event_data = {
    ...data,
    rating: data.rating,
    review_text: data.text,
    author_name: data.author_name
  };
  
  normalized.business_type = 'ecommerce';
  normalized.message_template = '{user_name} left a {rating}-star review';
}

function normalizeCustomSDKEvent(data: any, normalized: any) {
  normalized.user_name = data.user_name || data.name;
  normalized.user_email = data.user_email || data.email;
  normalized.user_location = data.user_location || data.location;
  normalized.business_type = data.business_type;
  
  // Generate appropriate message template
  if (data.event_type === 'newsletter_signup') {
    normalized.message_template = 'Someone from {user_location} subscribed to the newsletter';
  } else if (data.event_type === 'signup') {
    normalized.message_template = '{user_name} just signed up for a free trial';
  } else {
    normalized.message_template = '{user_name} just took an action';
  }
  
  normalized.event_data = { ...data };
}

function normalizeAPIEvent(data: any, normalized: any) {
  normalized.user_name = data.user_name || data.customer_name;
  normalized.user_email = data.user_email || data.email;
  normalized.user_location = data.user_location || data.location;
  normalized.business_type = data.business_type;
  
  normalized.event_data = { ...data };
  normalized.message_template = data.message_template || '{user_name} just took an action';
}

function normalizeFormHookEvent(data: any, normalized: any) {
  // Common form field mappings
  const fieldMappings = {
    name: ['name', 'full_name', 'first_name', 'your_name'],
    email: ['email', 'email_address', 'your_email'],
    location: ['location', 'city', 'address', 'country']
  };

  normalized.user_name = extractFieldValue(data, fieldMappings.name);
  normalized.user_email = extractFieldValue(data, fieldMappings.email);
  normalized.user_location = extractFieldValue(data, fieldMappings.location);
  
  normalized.event_data = {
    ...data,
    form_name: data.form_name || 'Contact Form'
  };
  
  normalized.event_type = 'form_submission';
  normalized.message_template = '{user_name} from {user_location} requested a consultation';
}

function normalizeJavaScriptAPIEvent(data: any, normalized: any) {
  normalized.user_name = data.user_name;
  normalized.user_email = data.user_email;
  normalized.user_location = data.user_location || data.location;
  
  normalized.event_data = { ...data };
  
  // Generate message template based on event type
  switch (data.eventType) {
    case 'download':
      normalized.message_template = '{user_name} downloaded {asset_name}';
      break;
    case 'newsletter_signup':
      normalized.message_template = 'Someone from {user_location} subscribed to the newsletter';
      break;
    default:
      normalized.message_template = '{user_name} just took an action';
  }
}

function normalizeGenericEvent(data: any, normalized: any) {
  normalized.user_name = data.user_name || data.name || data.customer_name;
  normalized.user_email = data.user_email || data.email;
  normalized.user_location = data.user_location || data.location;
  
  normalized.event_data = { ...data };
  normalized.message_template = '{user_name} just took an action';
}

function calculateQualityScore(normalized: any) {
  let score = 0;
  
  // Base score
  score += 20;
  
  // Name available
  if (normalized.user_name && normalized.user_name !== 'Someone') score += 20;
  
  // Email available
  if (normalized.user_email) score += 15;
  
  // Location available
  if (normalized.user_location) score += 15;
  
  // Rich event data
  if (Object.keys(normalized.event_data).length > 3) score += 10;
  
  // Recent event (assume all normalized events are recent)
  score += 20;
  
  normalized.quality_score = Math.min(score, 100);
}

function extractLocation(city?: string, country?: string): string | undefined {
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return undefined;
}

function extractNameFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const localPart = email.split('@')[0];
  return localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function extractFieldValue(data: any, possibleFields: string[]): string | undefined {
  for (const field of possibleFields) {
    if (data[field]) return data[field];
  }
  return undefined;
}