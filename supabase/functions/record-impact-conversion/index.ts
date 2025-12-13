import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const {
      website_id,
      goal_id,
      notification_id,
      campaign_id,
      visitor_id,
      interaction_type,
      interaction_timestamp,
      page_url,
      monetary_value,
      dedup_key,
    } = body;

    console.log('[record-impact-conversion] Recording conversion:', {
      website_id,
      goal_id,
      notification_id,
      dedup_key,
    });

    // Validate required fields
    if (!website_id || !goal_id || !notification_id || !visitor_id || !dedup_key) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['website_id', 'goal_id', 'notification_id', 'visitor_id', 'dedup_key'],
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the goal to find the user_id
    const { data: goal, error: goalError } = await supabase
      .from('impact_goals')
      .select('user_id, monetary_value')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      console.error('[record-impact-conversion] Goal not found:', goalError);
      return new Response(JSON.stringify({ error: 'Goal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to insert the conversion (dedup_key is unique, so duplicate inserts will fail)
    const { data: conversion, error: insertError } = await supabase
      .from('impact_conversions')
      .insert({
        website_id,
        user_id: goal.user_id,
        goal_id,
        notification_id,
        campaign_id: campaign_id || null,
        visitor_id,
        interaction_type,
        interaction_timestamp: interaction_timestamp || new Date().toISOString(),
        page_url,
        monetary_value: monetary_value || goal.monetary_value || 0,
        dedup_key,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate key error
      if (insertError.code === '23505') {
        console.log('[record-impact-conversion] Duplicate conversion ignored:', dedup_key);
        return new Response(JSON.stringify({
          success: true,
          status: 'already_recorded',
          message: 'This conversion was already recorded',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw insertError;
    }

    console.log('[record-impact-conversion] Conversion recorded:', conversion.id);

    return new Response(JSON.stringify({
      success: true,
      status: 'recorded',
      conversion_id: conversion.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[record-impact-conversion] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
