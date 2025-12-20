import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  tags: string;
  images: Array<{ src: string; alt: string | null }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    inventory_quantity: number;
    inventory_management: string | null;
  }>;
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
    const { connector_id, website_id } = body;

    console.log('Shopify product sync request:', { connector_id, website_id });

    if (!connector_id && !website_id) {
      return new Response(JSON.stringify({ error: 'Missing connector_id or website_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connector with credentials
    let query = supabase.from('integration_connectors').select('*');
    
    if (connector_id) {
      query = query.eq('id', connector_id);
    } else {
      query = query.eq('website_id', website_id).eq('integration_type', 'shopify');
    }

    const { data: connector, error: connectorError } = await query.single();

    if (connectorError || !connector) {
      console.error('Connector not found:', connectorError);
      return new Response(JSON.stringify({ error: 'Shopify connector not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { config } = connector;
    const shopDomain = config.shop;
    const accessToken = config.access_token;

    if (!shopDomain || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Shopify credentials' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch products from Shopify Admin API
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    let allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;
    let hasMore = true;

    while (hasMore) {
      let productsUrl = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&status=active`;
      
      if (pageInfo) {
        productsUrl = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&page_info=${pageInfo}`;
      }

      console.log('Fetching products from Shopify:', productsUrl);

      const response = await fetch(productsUrl, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API error:', response.status, errorText);
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      allProducts = [...allProducts, ...data.products];

      // Check for pagination via Link header
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^>]+)>; rel="next"/);
        pageInfo = match ? match[1] : null;
        hasMore = !!pageInfo;
      } else {
        hasMore = false;
      }

      // Safety limit
      if (allProducts.length > 5000) break;
    }

    console.log(`Fetched ${allProducts.length} products from Shopify`);

    // Get integration ID
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('website_id', connector.website_id)
      .eq('provider', 'shopify')
      .single();

    const integrationId = integration?.id || null;

    // Transform and upsert products
    const productsToUpsert = allProducts.map(product => {
      const firstVariant = product.variants?.[0];
      const totalInventory = product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0;

      return {
        website_id: connector.website_id,
        integration_id: integrationId,
        external_id: product.id.toString(),
        title: product.title,
        description: stripHtml(product.body_html || ''),
        handle: product.handle,
        product_url: `https://${shopDomain}/products/${product.handle}`,
        image_url: product.images?.[0]?.src || null,
        images: product.images?.map(img => img.src) || [],
        price: parseFloat(firstVariant?.price || '0'),
        compare_at_price: firstVariant?.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null,
        currency: 'USD', // Would need shop settings for accurate currency
        stock_quantity: totalInventory,
        stock_status: mapStockStatus(totalInventory),
        variants: product.variants?.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price,
          inventory_quantity: v.inventory_quantity,
        })) || [],
        tags: product.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        category: product.product_type || null,
        is_active: product.status === 'active',
        last_synced_at: new Date().toISOString(),
      };
    });

    // Batch upsert
    const batchSize = 50;
    let syncedCount = 0;

    for (let i = 0; i < productsToUpsert.length; i += batchSize) {
      const batch = productsToUpsert.slice(i, i + batchSize);
      
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(batch, { 
          onConflict: 'website_id,integration_id,external_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting products batch:', upsertError);
      } else {
        syncedCount += batch.length;
      }
    }

    // Update connector last sync time
    await supabase
      .from('integration_connectors')
      .update({
        last_sync: new Date().toISOString(),
        last_sync_status: { success: true, products_synced: syncedCount },
      })
      .eq('id', connector.id);

    // Log the sync
    await supabase.from('integration_logs').insert({
      integration_type: 'shopify',
      action: 'product_sync',
      status: 'success',
      details: { 
        products_synced: syncedCount,
        total_fetched: allProducts.length,
        website_id: connector.website_id,
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      products_synced: syncedCount,
      message: `Synced ${syncedCount} products from Shopify`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Shopify sync error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function mapStockStatus(quantity: number): string {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  return 'in_stock';
}
