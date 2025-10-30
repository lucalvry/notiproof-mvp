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
    console.log(`🔧 Running in ${stripeMode} mode`);

    // Try to get authenticated user (required for all requests now)
    let user = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
      }
    }

    const { priceId, billingPeriod, returnUrl, customerEmail, customerName } = await req.json();

    if (!priceId || !billingPeriod || !returnUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields: priceId, billingPeriod, returnUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For payment-first flow, customerEmail is required
    if (!customerEmail) {
      return new Response(JSON.stringify({ 
        error: 'Customer email required',
        reason: 'Please provide customer email for checkout.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | null = null;
    const normalizedEmail = customerEmail.trim().toLowerCase();

    console.log('Getting/Creating Stripe customer for:', normalizedEmail);

    if (!stripeCustomerId) {
      // Check if customer already exists in Stripe by email (prevent duplicates)
      const searchQuery = `email:"${normalizedEmail}"`;
      const encodedQuery = encodeURIComponent(searchQuery);
      
      console.log('🔍 Searching Stripe for customer:', normalizedEmail);
      const searchResponse = await fetch(
        `https://api.stripe.com/v1/customers/search?query=${encodedQuery}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        console.log('📊 Search result:', { 
          count: searchResult.data?.length || 0,
          requestId: searchResponse.headers.get('request-id'),
        });
        
        if (searchResult.data && searchResult.data.length > 0) {
          stripeCustomerId = searchResult.data[0].id;
          console.log('✅ Found existing Stripe customer:', stripeCustomerId);
          
          // Update our database with the found customer ID if user exists
          if (user?.id) {
            await supabase
              .from('user_subscriptions')
              .update({ stripe_customer_id: stripeCustomerId })
              .eq('user_id', user.id);
          }
        }
      } else {
        const errorText = await searchResponse.text();
        console.error('⚠️ Stripe customer search failed:', errorText);
      }
    }

    if (!stripeCustomerId) {
      // Create new Stripe customer with idempotency
      const idempotencyKey = `create_customer:${normalizedEmail}`;
      console.log('🆕 Creating new Stripe customer for:', normalizedEmail);
      
      const customerParams = new URLSearchParams({
        email: normalizedEmail,
        name: customerName || '',
        'metadata[pending_signup]': 'true',
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
        const errorText = await customerResponse.text();
        const requestId = customerResponse.headers.get('request-id');
        console.error('❌ Stripe customer creation failed:', {
          error: errorText,
          requestId,
          idempotencyKey,
        });
        throw new Error('Failed to create Stripe customer');
      }

      const customer = await customerResponse.json();
      stripeCustomerId = customer.id;
      console.log('✅ Created new Stripe customer:', {
        customerId: stripeCustomerId,
        requestId: customerResponse.headers.get('request-id'),
      });
    }

    if (!stripeCustomerId) {
      console.error('Failed to obtain Stripe customer ID');
      throw new Error('Failed to get Stripe customer ID');
    }

    // Check for existing active checkout sessions
    console.log('🔍 Checking for existing checkout sessions');
    const existingSessionsResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?customer=${stripeCustomerId}&status=open&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
      }
    );

    if (existingSessionsResponse.ok) {
      const existingSessions = await existingSessionsResponse.json();
      
      if (existingSessions.data && existingSessions.data.length > 0) {
        const existingSession = existingSessions.data[0];
        console.log('✅ Returning existing checkout session:', existingSession.id);
        
        return new Response(JSON.stringify({ 
          url: existingSession.url,
          sessionId: existingSession.id,
          existing: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create Stripe Checkout Session with 14-day trial
    const timestamp = Date.now();
    const idempotencyKey = `create_checkout:${normalizedEmail}:${priceId}:${billingPeriod}:${timestamp}`;
    console.log('🛒 Creating checkout session:', {
      customer: stripeCustomerId,
      priceId,
      billingPeriod,
      returnUrl,
      timestamp,
    });
    
    const checkoutParams = new URLSearchParams({
      'success_url': `${returnUrl}/complete-signup?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${returnUrl}/select-plan?canceled=true`,
      'customer': stripeCustomerId,
      'mode': 'subscription',
      
      // Payment method collection - REQUIRED
      'payment_method_collection': 'always',
      
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      
      // Metadata for payment-first flow
      'metadata[customer_email]': normalizedEmail,
      'metadata[customer_name]': customerName || '',
      'metadata[billing_period]': billingPeriod,
      'metadata[is_trial]': 'true',
      'metadata[payment_first]': 'true',
      
      // Subscription configuration
      'subscription_data[metadata][customer_email]': normalizedEmail,
      'subscription_data[metadata][billing_period]': billingPeriod,
      
      // TRIAL CONFIGURATION - 14 days, auto-cancel if no payment method
      'subscription_data[trial_period_days]': '14',
      'subscription_data[trial_settings][end_behavior][missing_payment_method]': 'cancel',
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
      const requestId = sessionResponse.headers.get('request-id');
      console.error('❌ Stripe checkout session creation failed:', {
        error,
        requestId,
        idempotencyKey,
        priceId,
        customerId: stripeCustomerId,
      });
      throw new Error('Failed to create checkout session');
    }

    const session = await sessionResponse.json();

    console.log('✅ Checkout session created successfully:', {
      sessionId: session.id,
      customer: stripeCustomerId,
      email: normalizedEmail,
      paymentFirst: true,
      requestId: sessionResponse.headers.get('request-id'),
      idempotencyKey,
      mode: stripeMode,
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeMode = stripeSecretKey?.startsWith('sk_live') ? 'LIVE' : 'TEST';
    
    console.error('❌ Error creating checkout session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      mode: stripeMode,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
