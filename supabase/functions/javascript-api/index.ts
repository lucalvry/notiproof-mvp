import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsData {
  pageUrl: string;
  referrer: string;
  userAgent: string;
  timestamp: string;
  eventType: 'pageview' | 'form_submit' | 'button_click' | 'custom';
  eventData?: any;
  userId?: string;
  sessionId: string;
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
    const { action, data, widgetId } = await req.json();
    console.log('JavaScript API request:', { action, widgetId });

    switch (action) {
      case 'track_event':
        return await trackEvent(supabase, data, widgetId);
        
      case 'track_form_submit':
        return await trackFormSubmit(supabase, data, widgetId);
        
      case 'track_pageview':
        return await trackPageview(supabase, data, widgetId);
        
      case 'get_widget_config':
        return await getWidgetConfig(supabase, widgetId);
        
      case 'track_conversion':
        return await trackConversion(supabase, data, widgetId);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in JavaScript API:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function trackEvent(supabase: any, analytics: AnalyticsData, widgetId: string) {
  console.log('Tracking custom event:', analytics.eventType);
  
  const eventData = {
    page_url: analytics.pageUrl,
    referrer: analytics.referrer,
    user_agent: analytics.userAgent,
    session_id: analytics.sessionId,
    timestamp: analytics.timestamp,
    event_type: analytics.eventType,
    custom_data: analytics.eventData || {},
    source: 'javascript_api'
  };

  const { error } = await supabase
    .from('events')
    .insert({
      widget_id: widgetId,
      event_type: analytics.eventType,
      event_data: eventData,
      views: analytics.eventType === 'pageview' ? 1 : 0,
      clicks: analytics.eventType === 'button_click' ? 1 : 0
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function trackFormSubmit(supabase: any, formData: any, widgetId: string) {
  console.log('Tracking form submission');
  
  const eventData = {
    form_id: formData.formId || 'unknown',
    fields: formData.fields || {},
    customer_name: formData.fields?.name || formData.fields?.first_name || 'Anonymous',
    email: formData.fields?.email,
    location: formData.location || 'Unknown',
    timestamp: new Date().toISOString(),
    source: 'form_submission',
    form_url: formData.pageUrl
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

async function trackPageview(supabase: any, pageData: any, widgetId: string) {
  console.log('Tracking pageview');
  
  const eventData = {
    page_url: pageData.pageUrl,
    page_title: pageData.pageTitle,
    referrer: pageData.referrer,
    session_id: pageData.sessionId,
    timestamp: pageData.timestamp,
    source: 'pageview_tracking'
  };

  const { error } = await supabase
    .from('events')
    .insert({
      widget_id: widgetId,
      event_type: 'view',
      event_data: eventData,
      views: 1,
      clicks: 0
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getWidgetConfig(supabase: any, widgetId: string) {
  console.log('Getting widget configuration');
  
  const { data: widget, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('id', widgetId)
    .eq('status', 'active')
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({ 
    widget,
    tracking_enabled: true 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function trackConversion(supabase: any, conversionData: any, widgetId: string) {
  console.log('Tracking conversion event');
  
  const eventData = {
    conversion_type: conversionData.type || 'purchase',
    value: conversionData.value || 0,
    currency: conversionData.currency || 'USD',
    product_name: conversionData.productName,
    customer_name: conversionData.customerName || 'Anonymous',
    location: conversionData.location || 'Unknown',
    timestamp: conversionData.timestamp || new Date().toISOString(),
    source: 'conversion_tracking',
    custom_data: conversionData.customData || {}
  };

  const { error } = await supabase
    .from('events')
    .insert({
      widget_id: widgetId,
      event_type: 'purchase',
      event_data: eventData,
      views: 0,
      clicks: 0
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}