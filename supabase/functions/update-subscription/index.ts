import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { newPriceId, newPlanId, billingPeriod } = await req.json();

    if (!newPriceId || !newPlanId || !billingPeriod) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing newPriceId, newPlanId, or billingPeriod' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔵 Updating subscription for user:', user.id);
    console.log('New Price ID:', newPriceId);
    console.log('New Plan ID:', newPlanId);
    console.log('Billing Period:', billingPeriod);

    // Get current user subscription from database
    const { data: currentSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !currentSub) {
      console.error('❌ No active subscription found:', subError);
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeSubscriptionId = currentSub.stripe_subscription_id;
    if (!stripeSubscriptionId) {
      console.error('❌ No Stripe subscription ID found');
      return new Response(
        JSON.stringify({ error: 'No Stripe subscription found. Please contact support.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current subscription from Stripe
    const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
    });

    if (!subResponse.ok) {
      const error = await subResponse.json();
      console.error('❌ Failed to fetch Stripe subscription:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch current subscription from Stripe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeSub = await subResponse.json();
    console.log('✅ Current Stripe subscription fetched:', stripeSub.id);

    // Update subscription with new price
    const updateResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'items[0][id]': stripeSub.items.data[0].id,
        'items[0][price]': newPriceId,
        'proration_behavior': 'always_invoice', // Create invoice immediately for proration
        'billing_cycle_anchor': 'unchanged', // Keep current billing date
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      console.error('❌ Failed to update Stripe subscription:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription in Stripe', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedSub = await updateResponse.json();
    console.log('✅ Stripe subscription updated:', updatedSub.id);

    // Get the latest invoice to check proration amount
    let prorationAmount = 0;
    if (updatedSub.latest_invoice) {
      const invoiceId = typeof updatedSub.latest_invoice === 'string' 
        ? updatedSub.latest_invoice 
        : updatedSub.latest_invoice.id;

      const invoiceResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoiceId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
      });

      if (invoiceResponse.ok) {
        const invoice = await invoiceResponse.json();
        prorationAmount = invoice.amount_due / 100; // Convert from cents to dollars
        console.log('💰 Proration amount:', prorationAmount);
      }
    }

    // Update local database with new plan
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_id: newPlanId,
        billing_period: billingPeriod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSub.id);

    if (updateError) {
      console.error('❌ Failed to update local database:', updateError);
      // Don't fail the request - Stripe update succeeded
      console.warn('⚠️ Database update failed but Stripe subscription was updated');
    } else {
      console.log('✅ Local database updated with new plan');
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: updatedSub.id,
        prorationAmount,
        currentPeriodEnd: updatedSub.current_period_end,
        message: prorationAmount > 0 
          ? `Plan updated! You'll be charged $${prorationAmount.toFixed(2)} for the prorated amount.`
          : 'Plan updated successfully!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
