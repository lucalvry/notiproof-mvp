import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { customerId, customerEmail, returnUrl } = await req.json();

    if (!customerId && !customerEmail) {
      console.error('❌ Missing customerId or customerEmail parameter');
      return new Response(
        JSON.stringify({ error: 'customer_identifier_required', message: 'Provide either customerId or customerEmail' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔵 Creating Stripe Customer Portal session');
    console.log('Customer ID:', customerId);
    console.log('Customer Email:', customerEmail);
    console.log('Return URL:', returnUrl);

    // Determine a valid Stripe customer ID
    let targetCustomerId: string | null = null;

    // If we have a customerId, verify it exists first
    if (customerId) {
      const customerCheckResponse = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      });

      if (customerCheckResponse.ok) {
        targetCustomerId = customerId;
        console.log('✅ Customer verified in Stripe');
      } else {
        const errorData = await customerCheckResponse.json();
        console.warn('⚠️ Provided customerId not found in Stripe, will try email lookup if available:', errorData);
      }
    }

    // If no valid customer yet and we have an email, try finding by email using Stripe Search API
    if (!targetCustomerId && customerEmail) {
      const searchResp = await fetch(`https://api.stripe.com/v1/customers/search?` + new URLSearchParams({
        query: `email:'${customerEmail}'`,
        limit: '1',
      }), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
      });

      if (searchResp.ok) {
        const list = await searchResp.json();
        if (Array.isArray(list.data) && list.data.length > 0) {
          targetCustomerId = list.data[0].id;
          console.log('✅ Found Stripe customer by email via search:', targetCustomerId);
        } else {
          console.warn('⚠️ No Stripe customer found by email');
        }
      } else {
        const err = await searchResp.json();
        console.error('❌ Error searching customer by email:', err);
      }
    }

    if (!targetCustomerId) {
      // Nothing found - return explicit error
      return new Response(
        JSON.stringify({ 
          error: 'customer_not_found',
          message: 'No Stripe customer found for this account. Start a new subscription to add a payment method.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe Customer Portal Session
    const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: targetCustomerId,
        return_url: returnUrl || `${new URL(req.url).origin}/billing`,
      }),
    });

    if (!portalResponse.ok) {
      const errorData = await portalResponse.json();
      console.error('❌ Stripe portal creation failed:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create portal session',
          details: errorData 
        }),
        { 
          status: portalResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const portal = await portalResponse.json();

    console.log('✅ Portal session created successfully:', portal.id);

    return new Response(
      JSON.stringify({ 
        url: portal.url,
        sessionId: portal.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
