import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailProvider {
  type: 'mailchimp' | 'convertkit' | 'klaviyo';
  api_key: string;
  list_id?: string;
  api_secret?: string;
}

interface EmailSubscriber {
  email: string;
  first_name?: string;
  last_name?: string;
  location?: string;
  source?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    const { action, data, widgetId, provider } = await req.json();
    console.log('Email integration request:', { action, provider, widgetId });

    switch (action) {
      case 'setup_mailchimp':
        return await setupMailchimp(supabase, data);
        
      case 'setup_convertkit':
        return await setupConvertKit(supabase, data);
        
      case 'setup_klaviyo':
        return await setupKlaviyo(supabase, data);
        
      case 'track_subscription':
        return await trackSubscription(supabase, data, widgetId);
        
      case 'sync_subscribers':
        return await syncSubscribers(supabase, data);
        
      case 'test_connection':
        return await testConnection(data);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in email integration:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function setupMailchimp(supabase: any, config: any) {
  console.log('Setting up Mailchimp integration');
  
  const { user_id, api_key, list_id, widget_id } = config;
  
  // Test connection first
  const testResponse = await fetch(`https://us1.api.mailchimp.com/3.0/lists/${list_id}`, {
    headers: {
      'Authorization': `Bearer ${api_key}`,
      'Content-Type': 'application/json'
    }
  });

  if (!testResponse.ok) {
    throw new Error('Invalid Mailchimp API key or list ID');
  }

  const { error } = await supabase
    .from('integration_hooks')
    .insert({
      user_id,
      type: 'mailchimp',
      url: `https://us1.api.mailchimp.com/3.0/lists/${list_id}`,
      config: {
        api_key,
        list_id,
        widget_id,
        sync_enabled: true
      }
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function setupConvertKit(supabase: any, config: any) {
  console.log('Setting up ConvertKit integration');
  
  const { user_id, api_key, api_secret, form_id, widget_id } = config;
  
  // Test connection
  const testResponse = await fetch(`https://api.convertkit.com/v3/forms?api_key=${api_key}`);
  
  if (!testResponse.ok) {
    throw new Error('Invalid ConvertKit API key');
  }

  const { error } = await supabase
    .from('integration_hooks')
    .insert({
      user_id,
      type: 'convertkit',
      url: `https://api.convertkit.com/v3/forms/${form_id}`,
      config: {
        api_key,
        api_secret,
        form_id,
        widget_id,
        sync_enabled: true
      }
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function setupKlaviyo(supabase: any, config: any) {
  console.log('Setting up Klaviyo integration');
  
  const { user_id, api_key, list_id, widget_id } = config;
  
  // Test connection
  const testResponse = await fetch(`https://a.klaviyo.com/api/v2/list/${list_id}`, {
    headers: {
      'Authorization': `Klaviyo-API-Key ${api_key}`,
      'Content-Type': 'application/json'
    }
  });

  if (!testResponse.ok) {
    throw new Error('Invalid Klaviyo API key or list ID');
  }

  const { error } = await supabase
    .from('integration_hooks')
    .insert({
      user_id,
      type: 'klaviyo',
      url: `https://a.klaviyo.com/api/v2/list/${list_id}`,
      config: {
        api_key,
        list_id,
        widget_id,
        sync_enabled: true
      }
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function trackSubscription(supabase: any, subscriber: EmailSubscriber, widgetId: string) {
  console.log('Tracking email subscription:', subscriber.email);
  
  const eventData = {
    customer_name: `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim() || 
                   subscriber.email.split('@')[0],
    email: subscriber.email,
    location: subscriber.location || 'Unknown',
    timestamp: new Date().toISOString(),
    source: subscriber.source || 'email_form',
    tags: subscriber.tags || [],
    custom_fields: subscriber.custom_fields || {}
  };

  const { error } = await supabase
    .from('events')
    .insert({
      widget_id: widgetId,
      event_type: 'signup',
      event_data: eventData,
      views: 0,
      clicks: 0
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncSubscribers(supabase: any, config: any) {
  console.log('Syncing subscribers from email provider');
  
  const { integration_id, provider_type, last_sync } = config;
  
  // Get integration config
  const { data: integration } = await supabase
    .from('integration_hooks')
    .select('*')
    .eq('id', integration_id)
    .single();

  if (!integration) {
    throw new Error('Integration not found');
  }

  let subscribers = [];
  
  switch (provider_type) {
    case 'mailchimp':
      subscribers = await fetchMailchimpSubscribers(integration.config, last_sync);
      break;
    case 'convertkit':
      subscribers = await fetchConvertKitSubscribers(integration.config, last_sync);
      break;
    case 'klaviyo':
      subscribers = await fetchKlaviyoSubscribers(integration.config, last_sync);
      break;
  }

  // Create events for new subscribers
  for (const subscriber of subscribers) {
    await trackSubscription(supabase, subscriber, integration.config.widget_id);
  }

  return new Response(JSON.stringify({ 
    success: true, 
    synced_count: subscribers.length 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchMailchimpSubscribers(config: any, lastSync: string) {
  const { api_key, list_id } = config;
  const since = lastSync ? `&since_timestamp_opt=${lastSync}` : '';
  
  const response = await fetch(
    `https://us1.api.mailchimp.com/3.0/lists/${list_id}/members?count=100${since}`,
    {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.members?.map((member: any) => ({
    email: member.email_address,
    first_name: member.merge_fields?.FNAME,
    last_name: member.merge_fields?.LNAME,
    location: member.location?.country,
    source: 'mailchimp'
  })) || [];
}

async function fetchConvertKitSubscribers(config: any, lastSync: string) {
  const { api_key, form_id } = config;
  const since = lastSync ? `&created_after=${lastSync}` : '';
  
  const response = await fetch(
    `https://api.convertkit.com/v3/forms/${form_id}/subscriptions?api_key=${api_key}${since}`
  );

  const data = await response.json();
  return data.subscriptions?.map((sub: any) => ({
    email: sub.subscriber.email_address,
    first_name: sub.subscriber.first_name,
    location: sub.subscriber.state,
    source: 'convertkit'
  })) || [];
}

async function fetchKlaviyoSubscribers(config: any, lastSync: string) {
  const { api_key, list_id } = config;
  
  const response = await fetch(
    `https://a.klaviyo.com/api/v2/list/${list_id}/members/all`,
    {
      headers: {
        'Authorization': `Klaviyo-API-Key ${api_key}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.records?.map((record: any) => ({
    email: record.email,
    first_name: record.first_name,
    last_name: record.last_name,
    location: record.city,
    source: 'klaviyo'
  })) || [];
}

async function testConnection(config: any) {
  const { provider_type, api_key, list_id } = config;
  
  let testUrl = '';
  let headers: Record<string, string> = {};
  
  switch (provider_type) {
    case 'mailchimp':
      testUrl = `https://us1.api.mailchimp.com/3.0/lists/${list_id}`;
      headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      };
      break;
    case 'convertkit':
      testUrl = `https://api.convertkit.com/v3/account?api_key=${api_key}`;
      break;
    case 'klaviyo':
      testUrl = `https://a.klaviyo.com/api/v2/list/${list_id}`;
      headers = {
        'Authorization': `Klaviyo-API-Key ${api_key}`,
        'Content-Type': 'application/json'
      };
      break;
  }

  const response = await fetch(testUrl, { headers });
  
  return new Response(JSON.stringify({ 
    success: response.ok,
    status: response.status 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}