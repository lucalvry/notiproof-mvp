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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get connector_id from URL query params
    const url = new URL(req.url);
    const connectorId = url.searchParams.get('connector_id');
    
    if (!connectorId) {
      throw new Error('connector_id is required');
    }

    // Verify connector exists and get config
    const { data: connector, error: connectorError } = await supabase
      .from('integration_connectors')
      .select('*')
      .eq('id', connectorId)
      .eq('integration_type', 'paypal')
      .single();

    if (connectorError || !connector) {
      throw new Error('Invalid connector');
    }

    // Parse PayPal IPN payload
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value.toString();
    }

    console.log('PayPal IPN received:', payload);

    // Verify IPN with PayPal (in production, you should verify the IPN)
    // For now, we'll trust the payload
    
    // Rate limiting check
    const { count } = await supabase
      .from('integration_logs')
      .select('*', { count: 'exact', head: true })
      .eq('integration_type', 'paypal')
      .gte('created_at', new Date(Date.now() - 10000).toISOString());

    if (count && count > 10) {
      console.log('Rate limit exceeded for PayPal webhook');
      return new Response('Rate limit exceeded', { status: 429, headers: corsHeaders });
    }

    // Check for duplicate using txn_id
    const txnId = payload.txn_id || payload.recurring_payment_id;
    if (txnId) {
      const { data: existing } = await supabase
        .from('webhook_dedup')
        .select('id')
        .eq('webhook_type', 'paypal')
        .eq('idempotency_key', txnId)
        .single();

      if (existing) {
        console.log('Duplicate PayPal IPN detected:', txnId);
        return new Response('Duplicate webhook', { status: 200, headers: corsHeaders });
      }

      // Store dedup entry
      await supabase
        .from('webhook_dedup')
        .insert({
          webhook_type: 'paypal',
          idempotency_key: txnId,
          payload: payload,
        });
    }

    // Extract event data based on payment_status and txn_type
    const paymentStatus = payload.payment_status;
    const txnType = payload.txn_type;
    const payerName = `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || payload.payer_email?.split('@')[0];
    const amount = payload.mc_gross || payload.amount;
    const currency = payload.mc_currency || payload.currency_code;
    
    let eventType = 'payment';
    let messageTemplate = '';

    // Determine event type and message
    if (txnType === 'subscr_signup') {
      eventType = 'subscription';
      messageTemplate = `${payerName} just started a subscription`;
    } else if (txnType === 'recurring_payment') {
      eventType = 'subscription_payment';
      messageTemplate = `${payerName} made a recurring payment of ${currency} ${amount}`;
    } else if (paymentStatus === 'Completed') {
      if (payload.item_name?.toLowerCase().includes('donation')) {
        eventType = 'donation';
        messageTemplate = `${payerName} just donated ${currency} ${amount}`;
      } else {
        eventType = 'purchase';
        messageTemplate = `${payerName} just made a purchase of ${currency} ${amount}`;
      }
    } else if (paymentStatus === 'Refunded') {
      eventType = 'refund';
      messageTemplate = `A refund of ${currency} ${amount} was processed`;
    }

    // Get user's primary widget
    const { data: widget } = await supabase
      .from('widgets')
      .select('id')
      .eq('user_id', connector.user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!widget) {
      throw new Error('No active widget found');
    }

    // Create event
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        widget_id: widget.id,
        event_type: eventType,
        event_data: payload,
        user_name: payerName,
        user_location: `${payload.address_city || ''}${payload.address_city && payload.address_country ? ', ' : ''}${payload.address_country || ''}`.trim() || undefined,
        message_template: messageTemplate,
        source: 'integration',
        status: 'approved',
      });

    if (eventError) {
      throw eventError;
    }

    // Update last_sync
    await supabase
      .from('integration_connectors')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connectorId);

    // Log success
    await supabase
      .from('integration_logs')
      .insert({
        integration_type: 'paypal',
        action: 'webhook_received',
        status: 'success',
        details: {
          txn_id: txnId,
          payment_status: paymentStatus,
          txn_type: txnType,
        },
        user_id: connector.user_id,
      });

    console.log('PayPal event processed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'PayPal IPN processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing PayPal IPN:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
