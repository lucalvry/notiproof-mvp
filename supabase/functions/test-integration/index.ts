import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { integration_type, config } = body;

    const startTime = Date.now();
    let testResult = { success: false, message: '', details: {} };

    switch (integration_type) {
      case 'shopify':
        testResult = await testShopify(config);
        break;
      case 'stripe':
        testResult = await testStripe(config);
        break;
      case 'woocommerce':
        testResult = await testWooCommerce(config);
        break;
      default:
        testResult = { success: false, message: 'Unknown integration type', details: {} };
    }

    const duration = Date.now() - startTime;

    await supabase.from('integration_logs').insert({
      integration_type,
      action: 'test_connection',
      status: testResult.success ? 'success' : 'error',
      details: testResult.details,
      user_id: user.id,
      error_message: testResult.success ? null : testResult.message,
      duration_ms: duration,
    });

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test Integration Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ success: false, message: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testShopify(config: any) {
  try {
    const { shop_domain, access_token } = config;
    const response = await fetch(`https://${shop_domain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });

    if (!response.ok) {
      return { success: false, message: 'Invalid Shopify credentials', details: { status: response.status } };
    }

    const data = await response.json();
    return { success: true, message: 'Connected successfully', details: { shop_name: data.shop?.name } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: errorMessage, details: {} };
  }
}

async function testStripe(config: any) {
  try {
    const { secret_key } = config;
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${secret_key}` },
    });

    if (!response.ok) {
      return { success: false, message: 'Invalid Stripe API key', details: { status: response.status } };
    }

    const data = await response.json();
    return { success: true, message: 'Connected successfully', details: { currency: data.available?.[0]?.currency } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: errorMessage, details: {} };
  }
}

async function testWooCommerce(config: any) {
  try {
    const { site_url, consumer_key, consumer_secret } = config;
    const auth = btoa(`${consumer_key}:${consumer_secret}`);
    const response = await fetch(`${site_url}/wp-json/wc/v3/system_status`, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!response.ok) {
      return { success: false, message: 'Invalid WooCommerce credentials', details: { status: response.status } };
    }

    const data = await response.json();
    return { success: true, message: 'Connected successfully', details: { version: data.environment?.version } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: errorMessage, details: {} };
  }
}
