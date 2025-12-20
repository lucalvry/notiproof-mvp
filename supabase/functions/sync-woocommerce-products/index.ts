import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  variations: number[];
  status: string;
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
    const { action, site_url, consumer_key, consumer_secret, connector_id, website_id } = body;

    console.log('WooCommerce sync request:', { action, site_url, connector_id });

    // Validate required fields
    if (!site_url || !consumer_key || !consumer_secret) {
      return new Response(JSON.stringify({ error: 'Missing required credentials' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build auth header for WooCommerce REST API
    const authString = btoa(`${consumer_key}:${consumer_secret}`);
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    };

    if (action === 'test') {
      // Test connection by fetching products
      const testUrl = `${site_url}/wp-json/wc/v3/products?per_page=1`;
      console.log('Testing connection to:', testUrl);

      const response = await fetch(testUrl, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WooCommerce API error:', response.status, errorText);
        
        if (response.status === 401) {
          return new Response(JSON.stringify({ 
            error: 'Invalid API credentials. Please check your Consumer Key and Secret.',
            success: false 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ 
          error: `WooCommerce API error: ${response.status}`,
          success: false 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get total products count from headers
      const totalProducts = parseInt(response.headers.get('X-WP-Total') || '0');

      return new Response(JSON.stringify({ 
        success: true, 
        product_count: totalProducts,
        message: 'Connection successful'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync') {
      if (!website_id) {
        return new Response(JSON.stringify({ error: 'Missing website_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch all products (paginated)
      let page = 1;
      const perPage = 100;
      let allProducts: WooProduct[] = [];
      let hasMore = true;

      while (hasMore) {
        const productsUrl = `${site_url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=publish`;
        console.log('Fetching products page:', page);

        const response = await fetch(productsUrl, { headers });

        if (!response.ok) {
          console.error('Failed to fetch products:', response.status);
          break;
        }

        const products: WooProduct[] = await response.json();
        allProducts = [...allProducts, ...products];

        // Check if there are more pages
        const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
        hasMore = page < totalPages;
        page++;

        // Safety limit
        if (page > 50) break;
      }

      console.log(`Fetched ${allProducts.length} products from WooCommerce`);

      // Get integration ID if connector_id provided
      let integrationId = null;
      if (connector_id) {
        const { data: connector } = await supabase
          .from('integration_connectors')
          .select('id')
          .eq('id', connector_id)
          .single();
        
        if (connector) {
          // Also check for integration record
          const { data: integration } = await supabase
            .from('integrations')
            .select('id')
            .eq('website_id', website_id)
            .eq('provider', 'woocommerce')
            .single();
          
          integrationId = integration?.id;
        }
      }

      // Upsert products to database
      const productsToUpsert = allProducts.map(product => ({
        website_id,
        integration_id: integrationId,
        external_id: product.id.toString(),
        title: product.name,
        description: product.short_description || product.description,
        handle: product.slug,
        product_url: product.permalink,
        image_url: product.images?.[0]?.src || null,
        images: product.images?.map(img => img.src) || [],
        price: parseFloat(product.price) || null,
        compare_at_price: product.sale_price ? (parseFloat(product.regular_price) || null) : null,
        currency: 'USD', // WooCommerce doesn't include currency in product response
        stock_quantity: product.stock_quantity,
        stock_status: mapStockStatus(product.stock_status, product.stock_quantity),
        category: product.categories?.[0]?.name || null,
        tags: product.tags?.map(tag => tag.name) || [],
        is_active: product.status === 'publish',
        last_synced_at: new Date().toISOString(),
      }));

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
      if (connector_id) {
        await supabase
          .from('integration_connectors')
          .update({
            last_sync: new Date().toISOString(),
            last_sync_status: { success: true, products_synced: syncedCount },
          })
          .eq('id', connector_id);
      }

      // Log the sync
      await supabase.from('integration_logs').insert({
        integration_type: 'woocommerce',
        action: 'product_sync',
        status: 'success',
        details: { 
          products_synced: syncedCount,
          total_fetched: allProducts.length,
          website_id,
        },
      });

      return new Response(JSON.stringify({ 
        success: true, 
        products_synced: syncedCount,
        message: `Synced ${syncedCount} products`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WooCommerce sync error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapStockStatus(wooStatus: string, quantity: number | null): string {
  if (wooStatus === 'outofstock') return 'out_of_stock';
  if (wooStatus === 'onbackorder') return 'on_backorder';
  if (quantity !== null && quantity <= 5) return 'low_stock';
  return 'in_stock';
}
