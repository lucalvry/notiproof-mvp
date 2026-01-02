import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-signature',
};

/**
 * Render Mustache template with event data
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Handle section blocks {{#key}}...{{/key}} (show if truthy)
  rendered = rendered.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      return content;
    }
    return '';
  });
  
  // Handle inverted blocks {{^key}}...{{/key}} (show if falsy)
  rendered = rendered.replace(/\{\{\^([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    if (value === undefined || value === null || value === '' || value === false) {
      return content;
    }
    return '';
  });
  
  // Handle simple substitutions {{key}}
  rendered = rendered.replace(/\{\{([^#^/][^}]*)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = data[trimmedKey];
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  return rendered;
}

/**
 * Get relative time string from timestamp
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return then.toLocaleDateString();
}

/**
 * Format currency based on currency code
 */
function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookTopic = req.headers.get('x-wc-webhook-topic');
    const webhookResource = req.headers.get('x-wc-webhook-resource');
    
    console.log('WooCommerce webhook received', { topic: webhookTopic, resource: webhookResource });

    // Handle ping/test requests
    if (webhookTopic === 'ping' || webhookResource === 'ping' || 
        webhookTopic?.includes('test') || webhookTopic?.includes('ping') || !webhookTopic) {
      console.log('WooCommerce ping/verification request - responding OK');
      return new Response(JSON.stringify({ success: true, message: 'Webhook endpoint ready' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.text();
    const signature = req.headers.get('x-wc-webhook-signature');
    
    if (!signature) {
      console.error('Missing WooCommerce signature');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(payload);
    console.log('WooCommerce order webhook received', { order_id: data.id, status: data.status });

    const siteUrl = new URL(req.url).searchParams.get('site_url');
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: 'Missing site_url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: connector, error: connectorError } = await supabaseClient
      .from('integration_connectors')
      .select('*, websites!inner(id, user_id, domain)')
      .eq('integration_type', 'woocommerce')
      .eq('status', 'active')
      .ilike('config->>site_url', `%${siteUrl}%`)
      .single();

    if (connectorError || !connector) {
      console.error('Invalid WooCommerce site', connectorError);
      return new Response(JSON.stringify({ error: 'Invalid site configuration' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify HMAC signature
    const secret = connector.config.consumer_secret;
    const hash = createHmac('sha256', secret).update(payload).digest('base64');
    if (hash !== signature) {
      console.error('Invalid WooCommerce signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const rateLimitKey = `webhook:${connector.id}`;
    const rateLimit = await checkRateLimit(rateLimitKey, {
      max_requests: connector.config.rate_limit || 1000,
      window_seconds: 3600
    });

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find widget linked to a WooCommerce campaign first
    const { data: campaignsWithWoo } = await supabaseClient
      .from('campaigns')
      .select('id, data_sources')
      .eq('website_id', connector.website_id)
      .eq('status', 'active');

    const wooCampaign = campaignsWithWoo?.find(c => 
      Array.isArray(c.data_sources) && c.data_sources.some((ds: any) => ds.provider === 'woocommerce')
    );

    let widget;
    if (wooCampaign) {
      // Find widget linked to the WooCommerce campaign
      const { data: wooWidget } = await supabaseClient
        .from('widgets')
        .select('id')
        .eq('website_id', connector.website_id)
        .eq('campaign_id', wooCampaign.id)
        .eq('status', 'active')
        .limit(1)
        .single();
      widget = wooWidget;
    }

    // Fallback to any active widget if no WooCommerce-specific widget found
    if (!widget) {
      const { data: fallbackWidget } = await supabaseClient
        .from('widgets')
        .select('id')
        .eq('website_id', connector.website_id)
        .eq('status', 'active')
        .limit(1)
        .single();
      widget = fallbackWidget;
    }

    if (!widget) {
      console.error('No active widget found for website', connector.website_id);
      return new Response(JSON.stringify({ error: 'No active widget configured' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Using widget for WooCommerce event:', widget.id, wooCampaign ? `(linked to campaign ${wooCampaign.id})` : '(fallback)');

    // Fetch WooCommerce template from database
    const { data: template } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('provider', 'woocommerce')
      .eq('template_key', 'woocommerce_purchase_v1')
      .eq('is_active', true)
      .single();

    // Extract order details
    const customerName = `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim() || 'Someone';
    const location = [data.billing?.city, data.billing?.country].filter(Boolean).join(', ') || null;
    const firstProduct = data.line_items?.[0];
    const productNames = data.line_items?.map((item: any) => item.name).join(', ') || 'products';
    const currency = data.currency || 'USD';
    const orderTotal = formatCurrency(parseFloat(data.total || 0), currency);
    const productPrice = firstProduct ? formatCurrency(parseFloat(firstProduct.price || 0), currency) : orderTotal;
    const timeAgo = getRelativeTime(new Date().toISOString());
    
    const siteBaseUrl = connector.config.site_url?.replace(/\/$/, '');

    // Lookup proper product URL from synced products table
    let productUrl = firstProduct?.permalink;
    if (!productUrl && firstProduct?.product_id) {
      const { data: syncedProduct } = await supabaseClient
        .from('products')
        .select('product_url, handle')
        .eq('website_id', connector.website_id)
        .eq('external_id', String(firstProduct.product_id))
        .maybeSingle();
      
      if (syncedProduct?.product_url) {
        productUrl = syncedProduct.product_url;
      } else if (syncedProduct?.handle) {
        productUrl = `${siteBaseUrl}/product/${syncedProduct.handle}/`;
      } else if (firstProduct?.slug) {
        productUrl = `${siteBaseUrl}/product/${firstProduct.slug}/`;
      }
    }

    // Prepare normalized data for template
    const normalizedData = {
      'template.customer_name': customerName,
      'template.customer_email': data.billing?.email,
      'template.customer_location': location || 'your store',
      'template.product_name': firstProduct?.name || productNames,
      'template.product_image': firstProduct?.image?.src,
      'template.product_price': productPrice,
      'template.order_total': orderTotal,
      'template.order_id': `#${data.id}`,
      'template.quantity': data.line_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 1,
      'template.time_ago': timeAgo,
    };

    // Render HTML template
    let messageTemplate: string;
    if (template?.html_template) {
      messageTemplate = renderTemplate(template.html_template, normalizedData);
      console.log('Rendered WooCommerce template for event');
    } else {
      // Fallback to plain text
      messageTemplate = `${customerName} from ${location || 'your store'} just purchased ${productNames}`;
    }

    // Create event with rendered template
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .insert({
        widget_id: widget.id,
        website_id: connector.website_id,
        event_type: 'purchase',
        message_template: messageTemplate,
        user_name: customerName,
        user_location: location,
        page_url: connector.websites.domain,
        event_data: {
          order_id: data.id,
          total: data.total,
          currency: data.currency,
          product_name: firstProduct?.name,
          product_url: productUrl,
          product_image: firstProduct?.image?.src,
          products: data.line_items?.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            url: item.permalink
          })),
          normalized: normalizedData,
          template_key: template?.template_key || null,
          source_type: 'webhook',
        },
        source: 'woocommerce',
        integration_type: 'woocommerce',
        status: 'pending',
        moderation_status: 'pending',
      })
      .select()
      .single();

    if (eventError) {
      console.error('Failed to create event', eventError);
      throw eventError;
    }

    // Log integration activity
    await supabaseClient.from('integration_logs').insert({
      integration_type: 'woocommerce',
      action: 'order_webhook',
      status: 'success',
      user_id: connector.websites.user_id,
      details: {
        connector_id: connector.id,
        event_id: event.id,
        order_id: data.id,
        template_used: template?.template_key || 'fallback',
      }
    });

    console.log('WooCommerce event created successfully', { event_id: event.id });

    return new Response(JSON.stringify({ success: true, event_id: event.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WooCommerce webhook error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
