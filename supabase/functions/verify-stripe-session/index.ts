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

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ 
        error: 'Missing sessionId',
        verified: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get checkout session from Stripe
    console.log('🔍 Retrieving Stripe session:', sessionId);
    const sessionResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items&expand[]=subscription`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Failed to retrieve Stripe session:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to retrieve checkout session',
        verified: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await sessionResponse.json();
    console.log('✅ Session retrieved:', {
      id: session.id,
      customer: session.customer,
      subscription: session.subscription?.id,
      status: session.status,
      payment_status: session.payment_status,
    });

    // Extract subscription details
    const customerId = session.customer;
    const subscriptionId = session.subscription?.id;
    const priceId = session.line_items?.data?.[0]?.price?.id;
    const billingPeriod = session.metadata?.billing_period || 'monthly';
    const signupEmail = session.metadata?.signup_email;
    const signupFullName = session.metadata?.signup_full_name;
    const customerEmail = session.customer_details?.email || signupEmail || '';

    // Get plan from price ID
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .single();

    if (!plans) {
      console.error('❌ No plan found for price:', priceId);
      return new Response(JSON.stringify({ 
        error: 'Plan not found',
        verified: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get authenticated user
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        console.log('👤 Authenticated user:', userId);
      }
    }

    // If no authenticated user but signup email exists, create the account
    if (!userId && signupEmail) {
      console.log('📧 Creating new user for:', signupEmail);
      
      // Create user with email confirmation already done
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: signupEmail,
        email_confirm: true,
        user_metadata: {
          full_name: signupFullName || '',
        },
      });

      if (createError || !newUser.user) {
        console.error('❌ Failed to create user:', createError);
        return new Response(JSON.stringify({ 
          error: 'Failed to create user account',
          verified: false 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUser.user.id;
      console.log('✅ User created:', userId);

      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        email: signupEmail,
        full_name: signupFullName || '',
      });
    }

    if (!userId) {
      console.error('❌ No user ID available');
      return new Response(JSON.stringify({ 
        error: 'User authentication required',
        verified: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get subscription details from Stripe if available
    let subscriptionStatus = 'active';
    let trialStart = null;
    let trialEnd = null;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;

    if (subscriptionId && session.subscription) {
      subscriptionStatus = session.subscription.status;
      if (session.subscription.trial_start) {
        trialStart = new Date(session.subscription.trial_start * 1000).toISOString();
      }
      if (session.subscription.trial_end) {
        trialEnd = new Date(session.subscription.trial_end * 1000).toISOString();
      }
      if (session.subscription.current_period_start) {
        currentPeriodStart = new Date(session.subscription.current_period_start * 1000).toISOString();
      }
      if (session.subscription.current_period_end) {
        currentPeriodEnd = new Date(session.subscription.current_period_end * 1000).toISOString();
      }
    }

    // Upsert user subscription
    console.log('💾 Upserting subscription for user:', userId);
    const { error: upsertError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: plans.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: subscriptionStatus,
        trial_start: trialStart,
        trial_end: trialEnd,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('❌ Failed to upsert subscription:', upsertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save subscription',
        verified: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record trial history if this is a trial
    if (trialStart) {
      console.log('📝 Recording trial history');
      
      // Check if trial history already exists
      const { data: existingTrial } = await supabase
        .from('user_trial_history')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existingTrial) {
        const { error: trialError } = await supabase
          .from('user_trial_history')
          .insert({
            user_id: userId,
            email: signupEmail || customerEmail,
            trial_started_at: trialStart,
            trial_ended_at: trialEnd,
          });

        if (trialError) {
          console.error('⚠️ Failed to record trial history:', trialError);
        }
      } else {
        console.log('ℹ️ Trial history already exists for user');
      }
    }

    console.log('✅ Subscription verified and saved successfully');

    return new Response(JSON.stringify({
      verified: true,
      status: subscriptionStatus,
      planName: plans.name,
      stripeCustomerId: customerId,
      subscriptionId,
      trial_end: trialEnd,
      userId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error verifying session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      verified: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
