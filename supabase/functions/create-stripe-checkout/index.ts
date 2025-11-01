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

    const { priceId, billingPeriod, returnUrl, customerEmail, customerName, userId, isUpgrade } = await req.json();

    // Phase 4: Log checkout initiation
    await supabase.from('integration_logs').insert({
      integration_type: 'stripe_checkout',
      action: 'checkout_initiated',
      status: 'started',
      user_id: userId || null,
      details: {
        price_id: priceId,
        billing_period: billingPeriod,
        customer_email: customerEmail,
        is_upgrade: isUpgrade || false,
        timestamp: new Date().toISOString()
      }
    });

    if (!priceId || !billingPeriod || !returnUrl) {
      // Log validation error
      await supabase.from('integration_logs').insert({
        integration_type: 'stripe_checkout',
        action: 'checkout_validation_failed',
        status: 'error',
        user_id: userId || null,
        details: { error: 'Missing required fields' }
      });
      
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

    // Helper function to search for existing customer with retry
    const searchStripeCustomer = async (retries = 3): Promise<string | null> => {
      const searchQuery = `email:"${normalizedEmail}"`;
      const encodedQuery = encodeURIComponent(searchQuery);
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          console.log(`🔍 Searching Stripe for customer (attempt ${attempt + 1}/${retries}):`, normalizedEmail);
          
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
              const customerId = searchResult.data[0].id;
              console.log('✅ Found existing Stripe customer:', customerId);
              
              // Update our database with the found customer ID if user exists
              if (user?.id) {
                await supabase
                  .from('user_subscriptions')
                  .update({ stripe_customer_id: customerId })
                  .eq('user_id', user.id);
              }
              
              return customerId;
            }
            return null;
          } else {
            const errorText = await searchResponse.text();
            console.error(`⚠️ Stripe customer search failed (attempt ${attempt + 1}):`, errorText);
            
            // Retry on 5xx errors
            if (searchResponse.status >= 500 && attempt < retries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
              console.log(`Retrying search in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
        } catch (err) {
          console.error(`⚠️ Error searching customer (attempt ${attempt + 1}):`, err);
          if (attempt < retries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
      }
      return null;
    };

    stripeCustomerId = await searchStripeCustomer();

    if (!stripeCustomerId) {
      // Create new Stripe customer with idempotency
      // FIX: Remove timestamp from idempotency key to prevent duplicates
      const planIdentifier = priceId.substring(0, 20);
      const idempotencyKey = `create_customer:${normalizedEmail}:v2`;
      console.log('🆕 Creating new Stripe customer for:', normalizedEmail);
      
      // Get plan name for metadata
      let planName = 'Unknown';
      try {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('name')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();
        if (planData) planName = planData.name;
      } catch (err) {
        console.error('Failed to fetch plan name:', err);
      }
      
      const customerParams = new URLSearchParams({
        email: normalizedEmail,
        name: customerName || '',
        'metadata[signup_status]': 'completed',
        'metadata[plan_name]': planName,
        'metadata[billing_period]': billingPeriod,
      });
      
      // Create customer with retry logic
      let customerResponse: Response | null = null;
      let lastError: string | null = null;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          customerResponse = await fetch('https://api.stripe.com/v1/customers', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Idempotency-Key': idempotencyKey,
            },
            body: customerParams,
          });

          if (customerResponse.ok) {
            break; // Success, exit retry loop
          }

          lastError = await customerResponse.text();
          const requestId = customerResponse.headers.get('request-id');
          
          console.error(`❌ Stripe customer creation failed (attempt ${attempt + 1}/${maxRetries}):`, {
            error: lastError,
            requestId,
            idempotencyKey,
            status: customerResponse.status
          });

          // Retry on 5xx errors or rate limits
          if ((customerResponse.status >= 500 || customerResponse.status === 429) && attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
            console.log(`Retrying customer creation in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            break; // Don't retry on 4xx errors (except 429)
          }
        } catch (err) {
          console.error(`⚠️ Network error creating customer (attempt ${attempt + 1}):`, err);
          lastError = err instanceof Error ? err.message : 'Network error';
          
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!customerResponse || !customerResponse.ok) {
        throw new Error('Failed to create Stripe customer after retries');
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
    // FIX: Use deterministic idempotency key for 5 minutes to prevent duplicate sessions
    const fiveMinuteWindow = Math.floor(Date.now() / (5 * 60 * 1000));
    const idempotencyKey = `create_checkout:${normalizedEmail}:${priceId}:${billingPeriod}:${fiveMinuteWindow}`;
    console.log('🛒 Creating checkout session:', {
      customer: stripeCustomerId,
      priceId,
      billingPeriod,
      returnUrl,
      timestamp,
      isUpgrade: isUpgrade || false,
    });
    
    // Dynamic success URL based on context (upgrade vs initial signup)
    const successUrl = isUpgrade 
      ? `${returnUrl}/billing?upgraded=true&session_id={CHECKOUT_SESSION_ID}`
      : `${returnUrl}/dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
    
    const checkoutParams = new URLSearchParams({
      'success_url': successUrl,
      'cancel_url': `${returnUrl}/select-plan?canceled=true`,
      'customer': stripeCustomerId,
      'client_reference_id': userId || '',
      'mode': 'subscription',
      
      // Payment method collection - REQUIRED
      'payment_method_collection': 'always',
      
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      
      // Store userId in metadata for verify-stripe-session
      'metadata[user_id]': userId || '',
      'metadata[customer_email]': normalizedEmail,
      'metadata[customer_name]': customerName || '',
      'metadata[billing_period]': billingPeriod,
      
      // Subscription configuration
      'subscription_data[metadata][user_id]': userId || '',
      'subscription_data[metadata][customer_email]': normalizedEmail,
      'subscription_data[metadata][billing_period]': billingPeriod,
      
      // TRIAL CONFIGURATION - 14 days
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

    const duration = Date.now() - startTime;
    
    console.log('✅ Checkout session created successfully:', {
      sessionId: session.id,
      customer: stripeCustomerId,
      email: normalizedEmail,
      paymentFirst: true,
      requestId: sessionResponse.headers.get('request-id'),
      idempotencyKey,
      mode: stripeMode,
      durationMs: duration,
    });

    // Phase 4: Log successful checkout creation
    await supabase.from('integration_logs').insert({
      integration_type: 'stripe_checkout',
      action: 'checkout_created',
      status: 'success',
      user_id: userId || null,
      duration_ms: duration,
      details: {
        session_id: session.id,
        customer_id: stripeCustomerId,
        price_id: priceId,
        billing_period: billingPeriod,
        is_upgrade: isUpgrade || false,
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeMode = stripeSecretKey?.startsWith('sk_live') ? 'LIVE' : 'TEST';
    
    console.error('❌ Error creating checkout session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      mode: stripeMode,
    });
    
    // Phase 4: Log checkout error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase.from('integration_logs').insert({
        integration_type: 'stripe_checkout',
        action: 'checkout_created',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          error_stack: error instanceof Error ? error.stack : undefined,
          mode: stripeMode
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
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
