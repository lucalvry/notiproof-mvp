/**
 * Build Notification Queue - Phase 2: Queue Orchestration
 * 
 * Fetches events with per-type limits, applies weighted interleaving,
 * and returns an optimized queue of max 15 events.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationWeight {
  event_type: string;
  weight: number;
  max_per_queue: number;
  ttl_days: number;
}

interface QueueConfig {
  websiteId: string;
  widgetIds: string[];
  targetQueueSize?: number;
}

const DEFAULT_WEIGHTS: Record<string, NotificationWeight> = {
  'purchase': { event_type: 'purchase', weight: 10, max_per_queue: 20, ttl_days: 7 },
  'testimonial': { event_type: 'testimonial', weight: 8, max_per_queue: 15, ttl_days: 180 },
  'signup': { event_type: 'signup', weight: 6, max_per_queue: 20, ttl_days: 14 },
  'announcement': { event_type: 'announcement', weight: 4, max_per_queue: 5, ttl_days: 30 },
  'live_visitors': { event_type: 'live_visitors', weight: 2, max_per_queue: 3, ttl_days: 1 },
};

/**
 * Fetch events grouped by type with per-type limits and TTL
 */
async function fetchGroupedEvents(
  supabase: any,
  config: QueueConfig,
  weights: Record<string, NotificationWeight>
): Promise<Record<string, any[]>> {
  const grouped: Record<string, any[]> = {};
  
  console.log('[Queue Builder] Fetching events for', config.widgetIds.length, 'widgets');
  
  for (const [eventType, weightConfig] of Object.entries(weights)) {
    const ttlDate = new Date(Date.now() - weightConfig.ttl_days * 86400000).toISOString();
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('widget_id', config.widgetIds)
      .eq('event_type', eventType)
      .eq('moderation_status', 'approved')
      .eq('status', 'approved')
      .gte('created_at', ttlDate)
      .order('created_at', { ascending: false })
      .limit(weightConfig.max_per_queue);
    
    if (error) {
      console.error(`[Queue Builder] Error fetching ${eventType}:`, error);
      grouped[eventType] = [];
    } else {
      grouped[eventType] = data || [];
      console.log(`[Queue Builder] Fetched ${data?.length || 0} ${eventType} events`);
    }
  }
  
  return grouped;
}

/**
 * Build weighted queue using round-robin selection based on weights
 */
function buildWeightedQueue(
  groupedEvents: Record<string, any[]>,
  weights: Record<string, NotificationWeight>,
  targetQueueSize: number = 15
): any[] {
  const queue: any[] = [];
  const cursors: Record<string, number> = {};
  
  // Initialize cursors
  Object.keys(groupedEvents).forEach(type => cursors[type] = 0);
  
  console.log('[Queue Builder] Building weighted queue, target size:', targetQueueSize);
  
  // Build weighted selection pool
  while (queue.length < targetQueueSize) {
    // Calculate total remaining weight
    let totalWeight = 0;
    const available: string[] = [];
    
    for (const type of Object.keys(groupedEvents)) {
      if (cursors[type] < groupedEvents[type].length) {
        totalWeight += weights[type]?.weight || 5;
        available.push(type);
      }
    }
    
    if (available.length === 0) {
      console.log('[Queue Builder] No more events available, queue size:', queue.length);
      break; // No more events
    }
    
    // Weighted random selection
    let random = Math.random() * totalWeight;
    let selectedType = available[0];
    
    for (const type of available) {
      random -= weights[type]?.weight || 5;
      if (random <= 0) {
        selectedType = type;
        break;
      }
    }
    
    // Add event from selected type
    const event = groupedEvents[selectedType][cursors[selectedType]];
    if (event) {
      queue.push(event);
      cursors[selectedType]++;
    }
  }
  
  console.log('[Queue Builder] Final queue distribution:', 
    Object.fromEntries(
      Object.entries(groupedEvents).map(([k, v]) => [
        k, 
        queue.filter(e => e.event_type === k).length
      ])
    )
  );
  
  return queue;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { websiteId, widgetIds, targetQueueSize = 15 } = await req.json();

    if (!websiteId || !widgetIds || widgetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing websiteId or widgetIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Queue Builder] Building queue for website:', websiteId);

    // Fetch notification weights for this website
    const { data: customWeights } = await supabase
      .from('notification_weights')
      .select('*')
      .eq('website_id', websiteId);

    // Merge custom weights with defaults
    const weights: Record<string, NotificationWeight> = { ...DEFAULT_WEIGHTS };
    if (customWeights) {
      for (const weight of customWeights) {
        weights[weight.event_type] = weight;
      }
    }

    // Fetch grouped events
    const groupedEvents = await fetchGroupedEvents(supabase, { websiteId, widgetIds, targetQueueSize }, weights);

    // Build weighted queue
    const queue = buildWeightedQueue(groupedEvents, weights, targetQueueSize);

    // Calculate distribution
    const distribution: Record<string, number> = {};
    for (const event of queue) {
      distribution[event.event_type] = (distribution[event.event_type] || 0) + 1;
    }

    const totalAvailable = Object.values(groupedEvents).reduce((sum, arr) => sum + arr.length, 0);

    return new Response(
      JSON.stringify({
        events: queue,
        queue_metadata: {
          total_available: totalAvailable,
          distribution,
          weights_applied: Object.fromEntries(
            Object.entries(weights).map(([k, v]) => [k, v.weight])
          ),
          ttl_applied: true,
          queue_size: queue.length,
          generated_at: new Date().toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Queue Builder] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
