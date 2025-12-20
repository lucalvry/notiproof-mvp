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
    const startTime = Date.now();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const stripeMode = stripeSecretKey.startsWith('sk_live') ? 'LIVE' : 'TEST';
    console.log(`🔧 LTD Checkout running in ${stripeMode} mode`);

    const { returnUrl, customerEmail, customerName, userId } = await req.json();

    // Log checkout initiation
    await supabase.from('integration_logs').insert({
      integration_type: 'stripe_ltd_checkout',
      action: 'checkout_initiated',
      status: 'started',
      user_id: userId || null,
      details: {
        customer_email: customerEmail,
        plan_type: 'LTD',
        timestamp: new Date().toISOString()
      }
    });

    if (!returnUrl || !customerEmail) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: returnUrl, customerEmail' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = customerEmail.trim().toLowerCase();

    // Get or create Stripe customer
    let stripeCustomerId: string | null = null;

    // Search for existing customer
    const searchQuery = `email:"${normalizedEmail}"`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    console.log('🔍 Searching Stripe for customer:', normalizedEmail);
    
    const searchResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=${encodedQuery}`,
      {
        headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
      }
    );

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.data && searchResult.data.length > 0) {
        stripeCustomerId = searchResult.data[0].id;
        console.log('✅ Found existing Stripe customer:', stripeCustomerId);
      }
    }

    if (!stripeCustomerId) {
      // Create new customer
      const idempotencyKey = `create_ltd_customer:${normalizedEmail}:v1`;
      console.log('🆕 Creating new Stripe customer for LTD:', normalizedEmail);
      
      const customerParams = new URLSearchParams({
        email: normalizedEmail,
        name: customerName || '',
        'metadata[plan_type]': 'LTD',
        'metadata[signup_status]': 'ltd_checkout',
      });
      
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': idempotencyKey,
        },
        body: customerParams,
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.text();
        console.error('❌ Failed to create customer:', error);
        throw new Error('Failed to create customer');
      }

      const customer = await customerResponse.json();
      stripeCustomerId = customer.id;
      console.log('✅ Created new Stripe customer:', stripeCustomerId);
    }

    // Create one-time payment checkout session (NOT subscription)
    const fiveMinuteWindow = Math.floor(Date.now() / (5 * 60 * 1000));
    const idempotencyKey = `create_ltd_checkout:${normalizedEmail}:${fiveMinuteWindow}`;
    
    console.log('🛒 Creating LTD checkout session:', {
      customer: stripeCustomerId,
      mode: 'payment',
      amount: 7900, // $79.00
    });

    const checkoutParams = new URLSearchParams({
      'success_url': `${returnUrl}/dashboard?ltd_success=true&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${returnUrl}/ltd?canceled=true`,
      'customer': stripeCustomerId!,
      'client_reference_id': userId || '',
      'mode': 'payment', // ONE-TIME PAYMENT, not subscription
      
      // Payment method collection
      'payment_method_types[0]': 'card',
      
      // Line item for LTD
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'NotiProof Lifetime Deal',
      'line_items[0][price_data][product_data][description]': '3 websites, 25K events/mo, 5GB storage, Custom domains, API access, Remove branding - Lifetime access!',
      'line_items[0][price_data][unit_amount]': '7900', // $79.00 in cents
      'line_items[0][quantity]': '1',
      
      // Store metadata for webhook processing
      'metadata[user_id]': userId || '',
      'metadata[customer_email]': normalizedEmail,
      'metadata[customer_name]': customerName || '',
      'metadata[plan_type]': 'LTD',
    });

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': idempotencyKey,
      },
      body: checkoutParams,
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      console.error('❌ Stripe checkout session creation failed:', error);
      throw new Error('Failed to create checkout session');
    }

    const session = await sessionResponse.json();
    const duration = Date.now() - startTime;
    
    console.log('✅ LTD Checkout session created successfully:', {
      sessionId: session.id,
      customer: stripeCustomerId,
      email: normalizedEmail,
      mode: stripeMode,
      durationMs: duration,
    });

    // Log successful checkout creation
    await supabase.from('integration_logs').insert({
      integration_type: 'stripe_ltd_checkout',
      action: 'checkout_created',
      status: 'success',
      user_id: userId || null,
      duration_ms: duration,
      details: {
        session_id: session.id,
        customer_id: stripeCustomerId,
        plan_type: 'LTD',
        amount: 7900,
        mode: stripeMode
      }
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error creating LTD checkout session:', errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      reason: 'Unable to process LTD checkout. Please try again.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
