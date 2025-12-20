import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WooOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_completed: string | null;
  total: string;
  currency: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    city: string;
    state: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: number;
    image?: { src: string };
    permalink?: string;
    slug?: string;
  }>;
}

/**
 * Render Mustache template with event data
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  rendered = rendered.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = data[key.trim()];
    return (value !== undefined && value !== null && value !== '' && value !== false) ? content : '';
  });
  
  rendered = rendered.replace(/\{\{\^([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = data[key.trim()];
    return (value === undefined || value === null || value === '' || value === false) ? content : '';
  });
  
  rendered = rendered.replace(/\{\{([^#^/][^}]*)\}\}/g, (match, key) => {
    const value = data[key.trim()];
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { connector_id, website_id, site_url, consumer_key, consumer_secret, days_back = 30 } = body;

    console.log('WooCommerce historical import started:', { site_url, days_back, connector_id });

    if (!site_url || !consumer_key || !consumer_secret || !website_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch WooCommerce template from database
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('provider', 'woocommerce')
      .eq('template_key', 'woocommerce_purchase_v1')
      .eq('is_active', true)
      .single();

    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    const headers = { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' };

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - days_back);
    const afterDateStr = afterDate.toISOString();

    let page = 1;
    const perPage = 100;
    let allOrders: WooOrder[] = [];
    let hasMore = true;

    while (hasMore) {
      const ordersUrl = `${site_url}/wp-json/wc/v3/orders?per_page=${perPage}&page=${page}&status=completed&after=${afterDateStr}&orderby=date&order=desc`;
      console.log('Fetching orders page:', page);

      const response = await fetch(ordersUrl, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WooCommerce API error:', response.status, errorText);
        throw new Error(`WooCommerce API error: ${response.status}`);
      }

      const orders: WooOrder[] = await response.json();
      allOrders = [...allOrders, ...orders];

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;
      if (page > 20) break;
    }

    console.log(`Fetched ${allOrders.length} completed orders from WooCommerce`);

    // Find widget linked to a WooCommerce campaign first
    const { data: campaignsWithWoo } = await supabase
      .from('campaigns')
      .select('id, data_sources')
      .eq('website_id', website_id)
      .eq('status', 'active');

    const wooCampaign = campaignsWithWoo?.find(c => 
      Array.isArray(c.data_sources) && c.data_sources.some((ds: any) => ds.provider === 'woocommerce')
    );

    let widget;
    if (wooCampaign) {
      const { data: wooWidget } = await supabase
        .from('widgets')
        .select('id')
        .eq('website_id', website_id)
        .eq('campaign_id', wooCampaign.id)
        .eq('status', 'active')
        .limit(1)
        .single();
      widget = wooWidget;
    }

    // Fallback to any active widget
    if (!widget) {
      const { data: fallbackWidget } = await supabase
        .from('widgets')
        .select('id')
        .eq('website_id', website_id)
        .eq('status', 'active')
        .limit(1)
        .single();
      widget = fallbackWidget;
    }

    if (!widget) {
      console.error('No active widget found');
      return new Response(JSON.stringify({ 
        error: 'No active widget found. Please create a widget first.',
        orders_imported: allOrders.length,
        events_created: 0,
        errors: ['No active widget configured']
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Using widget for import:', widget.id, wooCampaign ? `(linked to campaign ${wooCampaign.id})` : '(fallback)');

    const { data: website } = await supabase
      .from('websites')
      .select('domain')
      .eq('id', website_id)
      .single();

    const orderIds = allOrders.map(o => o.id.toString());
    const { data: existingEvents } = await supabase
      .from('events')
      .select('external_id')
      .eq('widget_id', widget.id)
      .eq('integration_type', 'woocommerce')
      .in('external_id', orderIds);

    const existingOrderIds = new Set(existingEvents?.map(e => e.external_id) || []);
    const newOrders = allOrders.filter(o => !existingOrderIds.has(o.id.toString()));

    console.log(`${newOrders.length} new orders to import (${existingOrderIds.size} already exist)`);

    // Pre-fetch all synced products for this website for efficient lookup
    const productIds = [...new Set(allOrders.flatMap(o => o.line_items.map(item => String(item.product_id))))];
    const { data: syncedProducts } = await supabase
      .from('products')
      .select('external_id, product_url, handle')
      .eq('website_id', website_id)
      .in('external_id', productIds);

    const productLookup = new Map(syncedProducts?.map(p => [p.external_id, p]) || []);

    const eventsToInsert = newOrders.map(order => {
      const customerName = `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim() || 'Someone';
      const location = [order.billing.city, order.billing.country].filter(Boolean).join(', ') || null;
      const firstProduct = order.line_items[0];
      const productNames = order.line_items.map(item => item.name).join(', ') || 'products';
      const currency = order.currency || 'USD';
      const orderTotal = formatCurrency(parseFloat(order.total || '0'), currency);
      const productPrice = firstProduct ? formatCurrency(firstProduct.price || 0, currency) : orderTotal;
      const timeAgo = getRelativeTime(order.date_completed || order.date_created);
      
      const siteBaseUrl = site_url.replace(/\/$/, '');
      
      // Lookup proper product URL from synced products
      let productUrl = firstProduct?.permalink;
      if (!productUrl && firstProduct?.product_id) {
        const syncedProduct = productLookup.get(String(firstProduct.product_id));
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
        'template.customer_email': order.billing.email,
        'template.customer_location': location || 'your store',
        'template.product_name': firstProduct?.name || productNames,
        'template.product_image': firstProduct?.image?.src,
        'template.product_price': productPrice,
        'template.order_total': orderTotal,
        'template.order_id': `#${order.id}`,
        'template.quantity': order.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1,
        'template.time_ago': timeAgo,
      };

      // Render HTML template
      let messageTemplate: string;
      if (template?.html_template) {
        messageTemplate = renderTemplate(template.html_template, normalizedData);
      } else {
        messageTemplate = `${customerName} from ${location || 'your store'} purchased ${productNames}`;
      }

      return {
        widget_id: widget.id,
        website_id: website_id,
        event_type: 'purchase',
        message_template: messageTemplate,
        user_name: customerName,
        user_location: location,
        page_url: website?.domain || site_url,
        external_id: order.id.toString(),
        event_data: {
          order_id: order.id,
          order_number: order.number,
          total: order.total,
          currency: order.currency,
          product_name: firstProduct?.name,
          product_url: productUrl,
          product_image: firstProduct?.image?.src,
          products: order.line_items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          normalized: normalizedData,
          template_key: template?.template_key || null,
          source_type: 'import',
          imported: true,
          import_date: new Date().toISOString(),
        },
        source: 'woocommerce',
        integration_type: 'woocommerce',
        status: 'pending',
        moderation_status: 'pending',
        created_at: order.date_completed || order.date_created,
      };
    });

    const batchSize = 50;
    let eventsCreated = 0;
    const errors: string[] = [];

    for (let i = 0; i < eventsToInsert.length; i += batchSize) {
      const batch = eventsToInsert.slice(i, i + batchSize);
      
      const { error: insertError, data: insertedEvents } = await supabase
        .from('events')
        .insert(batch)
        .select();

      if (insertError) {
        console.error('Error inserting events batch:', insertError);
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`);
      } else {
        eventsCreated += insertedEvents?.length || 0;
      }
    }

    await supabase.from('integration_logs').insert({
      integration_type: 'woocommerce',
      action: 'historical_import',
      status: errors.length > 0 ? 'partial' : 'success',
      details: {
        connector_id,
        website_id,
        days_back,
        orders_found: allOrders.length,
        orders_new: newOrders.length,
        events_created: eventsCreated,
        template_used: template?.template_key || 'fallback',
        errors,
      },
    });

    console.log('Historical import completed:', { eventsCreated, errors: errors.length });

    return new Response(JSON.stringify({
      success: true,
      orders_imported: newOrders.length,
      events_created: eventsCreated,
      skipped: existingOrderIds.size,
      template_used: template?.template_key || 'fallback',
      errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WooCommerce import error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      orders_imported: 0,
      events_created: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
