import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16'
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !endpointSecret) {
      return new Response('Missing signature or webhook secret', { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    console.log('Stripe webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(supabase, event.data.object as Stripe.Subscription, 'subscription');
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentEvent(supabase, event.data.object as Stripe.PaymentIntent, 'purchase');
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoiceEvent(supabase, event.data.object as Stripe.Invoice, 'subscription');
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutEvent(supabase, event.data.object as Stripe.Checkout.Session);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleSubscriptionEvent(supabase: any, subscription: Stripe.Subscription, eventType: string) {
  try {
    // Get customer details
    const customer = subscription.customer as string;
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16'
    });
    
    const customerObj = await stripe.customers.retrieve(customer);
    
    if (customerObj.deleted) {
      console.log('Customer was deleted, skipping event');
      return;
    }

    // Find widgets for this customer (you'd need to implement customer-widget mapping)
    const { data: integrationConnectors } = await supabase
      .from('integration_connectors')
      .select('user_id')
      .eq('integration_type', 'stripe')
      .eq('status', 'active');

    if (!integrationConnectors || integrationConnectors.length === 0) {
      console.log('No active Stripe integration connectors found');
      return;
    }

    // For each connector, find associated widgets and create events
    for (const connector of integrationConnectors) {
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', connector.user_id)
        .eq('status', 'active')
        .limit(1);

      if (widgets && widgets.length > 0) {
        const widgetId = widgets[0].id;
        
        // Extract plan name from subscription
        const planName = subscription.items.data[0]?.price.nickname || 'Premium Plan';
        const amount = subscription.items.data[0]?.price.unit_amount || 0;
        
        // Create normalized event
        const eventData = {
          widget_id: widgetId,
          event_type: eventType,
          event_data: {
            subscription_id: subscription.id,
            customer_id: customer,
            plan_name: planName,
            amount: amount,
            currency: subscription.currency,
            status: subscription.status
          },
          user_email: (customerObj as any).email,
          user_name: (customerObj as any).name || extractNameFromEmail((customerObj as any).email),
          integration_type: 'stripe',
          moderation_status: 'approved',
          quality_score: 80,
          business_type: 'saas',
          source: 'natural',
          message_template: '{user_name} upgraded to {plan_name}',
          views: 0,
          clicks: 0
        };

        const { error } = await supabase.from('events').insert(eventData);
        
        if (error) {
          console.error('Error inserting subscription event:', error);
        } else {
          console.log('Successfully created subscription event for widget:', widgetId);
        }
      }
    }
  } catch (error) {
    console.error('Error handling subscription event:', error);
  }
}

async function handlePaymentEvent(supabase: any, paymentIntent: Stripe.PaymentIntent, eventType: string) {
  try {
    const customer = paymentIntent.customer as string;
    
    if (!customer) {
      console.log('No customer associated with payment, skipping');
      return;
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16'
    });
    
    const customerObj = await stripe.customers.retrieve(customer);
    
    if (customerObj.deleted) {
      console.log('Customer was deleted, skipping event');
      return;
    }

    // Find active Stripe connectors and create events
    const { data: integrationConnectors } = await supabase
      .from('integration_connectors')
      .select('user_id')
      .eq('integration_type', 'stripe')
      .eq('status', 'active');

    if (!integrationConnectors || integrationConnectors.length === 0) {
      console.log('No active Stripe integration connectors found');
      return;
    }

    for (const connector of integrationConnectors) {
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', connector.user_id)
        .eq('status', 'active')
        .limit(1);

      if (widgets && widgets.length > 0) {
        const widgetId = widgets[0].id;
        
        const eventData = {
          widget_id: widgetId,
          event_type: eventType,
          event_data: {
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            description: paymentIntent.description
          },
          user_email: (customerObj as any).email,
          user_name: (customerObj as any).name || extractNameFromEmail((customerObj as any).email),
          integration_type: 'stripe',
          moderation_status: 'approved',
          quality_score: 85,
          business_type: 'ecommerce',
          source: 'natural',
          message_template: '{user_name} just made a purchase',
          views: 0,
          clicks: 0
        };

        const { error } = await supabase.from('events').insert(eventData);
        
        if (error) {
          console.error('Error inserting payment event:', error);
        } else {
          console.log('Successfully created payment event for widget:', widgetId);
        }
      }
    }
  } catch (error) {
    console.error('Error handling payment event:', error);
  }
}

async function handleInvoiceEvent(supabase: any, invoice: Stripe.Invoice, eventType: string) {
  // Similar to subscription event but for invoice payments
  await handleSubscriptionEvent(supabase, { 
    id: invoice.subscription as string,
    customer: invoice.customer,
    items: { data: [{ price: { nickname: 'Subscription', unit_amount: invoice.amount_paid } }] },
    currency: invoice.currency,
    status: 'active'
  } as any, eventType);
}

async function handleCheckoutEvent(supabase: any, session: Stripe.Checkout.Session) {
  try {
    const customer = session.customer as string;
    
    if (!customer) {
      console.log('No customer associated with checkout session');
      return;
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16'
    });
    
    const customerObj = await stripe.customers.retrieve(customer);
    
    if (customerObj.deleted) {
      console.log('Customer was deleted, skipping event');
      return;
    }

    // Determine event type based on session mode
    const eventType = session.mode === 'subscription' ? 'subscription' : 'purchase';
    
    // Find active Stripe connectors and create events
    const { data: integrationConnectors } = await supabase
      .from('integration_connectors')
      .select('user_id')
      .eq('integration_type', 'stripe')
      .eq('status', 'active');

    if (!integrationConnectors || integrationConnectors.length === 0) {
      console.log('No active Stripe integration connectors found');
      return;
    }

    for (const connector of integrationConnectors) {
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', connector.user_id)
        .eq('status', 'active')
        .limit(1);

      if (widgets && widgets.length > 0) {
        const widgetId = widgets[0].id;
        
        const eventData = {
          widget_id: widgetId,
          event_type: eventType,
          event_data: {
            session_id: session.id,
            amount_total: session.amount_total,
            currency: session.currency,
            payment_status: session.payment_status,
            mode: session.mode
          },
          user_email: (customerObj as any).email,
          user_name: (customerObj as any).name || extractNameFromEmail((customerObj as any).email),
          integration_type: 'stripe',
          moderation_status: 'approved',
          quality_score: 90,
          business_type: session.mode === 'subscription' ? 'saas' : 'ecommerce',
          source: 'natural',
          message_template: session.mode === 'subscription' 
            ? '{user_name} just subscribed' 
            : '{user_name} just made a purchase',
          views: 0,
          clicks: 0
        };

        const { error } = await supabase.from('events').insert(eventData);
        
        if (error) {
          console.error('Error inserting checkout event:', error);
        } else {
          console.log('Successfully created checkout event for widget:', widgetId);
        }
      }
    }
  } catch (error) {
    console.error('Error handling checkout event:', error);
  }
}

function extractNameFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const localPart = email.split('@')[0];
  return localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}