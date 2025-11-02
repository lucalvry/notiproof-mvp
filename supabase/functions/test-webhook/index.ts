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

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { connector_id, integration_type } = await req.json();

    if (!connector_id || !integration_type) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: connector_id, integration_type' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Testing webhook for connector', { connector_id, integration_type, user_id: user.id });

    // Get connector details
    const { data: connector, error: connectorError } = await supabase
      .from('integration_connectors')
      .select('*, websites!inner(id, user_id, domain)')
      .eq('id', connector_id)
      .eq('user_id', user.id)
      .single();

    if (connectorError || !connector) {
      console.error('Connector not found:', connectorError);
      return new Response(JSON.stringify({ 
        error: 'Connector not found or unauthorized' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get webhook URL from connector config
    const webhookUrl = connector.config?.webhook_url;
    
    if (!webhookUrl) {
      return new Response(JSON.stringify({ 
        error: 'Webhook URL not found in connector configuration' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create sample test payload based on integration type
    const samplePayloads: Record<string, any> = {
      shopify: {
        id: Date.now(),
        domain: connector.websites.domain,
        customer: {
          first_name: 'Test User',
          email: 'test@example.com'
        },
        shipping_address: {
          city: 'Lagos',
          country: 'Nigeria'
        },
        line_items: [{
          title: 'Test Product',
          price: '50.00'
        }],
        total_price: '50.00',
        currency: 'NGN'
      },
      stripe: {
        id: `test_${Date.now()}`,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            amount: 5000,
            currency: 'usd',
            customer_email: 'test@example.com',
            description: 'Test payment'
          }
        }
      },
      typeform: {
        form_response: {
          form_id: 'test_form',
          token: `test_${Date.now()}`,
          answers: [
            { field: { type: 'short_text' }, text: 'Test Response' }
          ]
        }
      },
      webhook: {
        id: `test_${Date.now()}`,
        event_type: 'conversion',
        message: 'Test User from Lagos just signed up',
        user: {
          name: 'Test User',
          location: 'Lagos, Nigeria'
        },
        timestamp: new Date().toISOString()
      }
    };

    const testPayload = samplePayloads[integration_type] || samplePayloads.webhook;

    console.log('Sending test webhook to:', webhookUrl);

    // Send test webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Token': connector.config?.webhook_token || '',
        'X-Test-Webhook': 'true'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await webhookResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('Webhook test response:', {
      status: webhookResponse.status,
      ok: webhookResponse.ok,
      data: responseData
    });

    // Log test attempt
    await supabase.from('integration_logs').insert({
      integration_type,
      action: 'webhook_test',
      status: webhookResponse.ok ? 'success' : 'failed',
      user_id: user.id,
      details: {
        connector_id,
        response_status: webhookResponse.status,
        response_data: responseData
      }
    });

    if (!webhookResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook test failed',
        status: webhookResponse.status,
        response: responseData
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Test webhook sent successfully',
      response: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
