import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      console.error('No session ID provided');
      return new Response(
        JSON.stringify({ verified: false, error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying LTD session:', sessionId);

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('Stripe secret key not configured');
      return new Response(
        JSON.stringify({ verified: false, error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Get the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Retrieved session:', { 
      id: session.id, 
      mode: session.mode, 
      status: session.status,
      metadata: session.metadata,
      customer: session.customer 
    });

    // Verify this is an LTD purchase
    if (session.mode !== 'payment') {
      console.error('Session is not a payment session:', session.mode);
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid session type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.metadata?.plan_type !== 'LTD') {
      console.error('Session is not an LTD purchase:', session.metadata);
      return new Response(
        JSON.stringify({ verified: false, error: 'Not a lifetime deal purchase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.payment_status !== 'paid') {
      console.error('Payment not completed:', session.payment_status);
      return new Response(
        JSON.stringify({ verified: false, error: 'Payment not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the current user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ verified: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from the auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verified user:', user.id, user.email);

    const stripeCustomerId = session.customer as string;

    // Check if subscription exists for this Stripe customer
    const { data: existingSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
    }

    if (existingSub) {
      console.log('Found existing subscription:', existingSub.id);
      
      // If the subscription doesn't have a user_id, link it to this user
      if (!existingSub.user_id) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ user_id: user.id })
          .eq('id', existingSub.id);

        if (updateError) {
          console.error('Failed to link subscription to user:', updateError);
          return new Response(
            JSON.stringify({ verified: false, error: 'Failed to link subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('Linked subscription to user:', user.id);
      } else if (existingSub.user_id !== user.id) {
        // Subscription belongs to a different user
        console.error('Subscription belongs to different user:', existingSub.user_id);
        return new Response(
          JSON.stringify({ verified: false, error: 'Subscription belongs to another account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          verified: true, 
          planName: 'Lifetime Deal',
          status: existingSub.status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No subscription found - create one
    console.log('Creating new LTD subscription for user:', user.id);
    
    const { data: newSub, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        plan_id: 'ltd',
        status: 'lifetime',
        current_period_start: new Date().toISOString(),
        current_period_end: null, // Lifetime = no end date
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create subscription:', insertError);
      return new Response(
        JSON.stringify({ verified: false, error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created LTD subscription:', newSub.id);

    return new Response(
      JSON.stringify({ 
        verified: true, 
        planName: 'Lifetime Deal',
        status: 'lifetime' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying LTD session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ verified: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
